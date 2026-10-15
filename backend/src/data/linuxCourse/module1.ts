// Module 1 — The Shell & Filesystem
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — The Shell & Filesystem',
  summary:
    'pwd, ls, cd, paths absolute vs relative, mkdir/rm/cp/mv, and reading man pages without fear.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'lnx-1-1',
      1,
      'Navigation and Paths',
      'Where am I, what is here, and how paths actually resolve.',
      11,
      nineBlocks({
        objectives: [
          'Use pwd, ls, cd and interpret absolute vs relative paths',
          'Create and remove directories safely (mkdir -p, rmdir, rm -r care)',
          'Read ls flags and predict what a command will touch before running it',
        ],
        hook: 'Every server, CI runner and cloud VM assumes you can drive a shell. The filesystem tree is the same shape on your laptop, a lab Linux box and a production container — once navigation is muscle memory, everything else is vocabulary.',
        concept: `**Where you are:** pwd prints the working directory. Everything relative resolves from there.

**Absolute vs relative:**
- Absolute starts at / (root): /home/you/notes.txt
- Relative starts from cwd: notes.txt or ../shared/todo.md
- ~ expands to your home directory; . is here; .. is parent.

**Listing:** ls, ls -l (long), ls -a (hidden), ls -lah (human sizes). Colour output means: blue directory, green executable, cyan symlink.

**Changing directory:** cd /var/log, cd .., cd - (previous), cd (home).

**Create / remove:**
- mkdir -p a/b/c — parents as needed, no error if exists.
- rmdir empty_dir — only if empty.
- rm -r dir — recursive; rm -rf is powerful and irreversible. Prefer trash or explicit paths. Never rm -rf / or unquoted variables that might be empty.

**Read before you destroy:** ls the target; echo "$VAR" before rm -rf "$VAR".`,
        extras: [
          table('Path meaning', ['Token', 'Resolves to'], [
            ['/', 'Root of the filesystem'],
            ['.', 'Current directory'],
            ['..', 'Parent directory'],
            ['~', 'Your home directory'],
            ['-', 'Previous working directory (cd -)'],
          ]),
          tip(
            'Tab completion is mandatory',
            'Escaping paths by hand is how people delete the wrong tree. Tab until the path is unambiguous.',
          ),
          warn(
            'rm -rf with a typo or empty variable',
            'Can wipe the wrong directory instantly. Quote variables; dry-run with echo first.',
          ),
        ],
        worked: {
          title: 'Explore a project tree',
          problem: 'From home, list a project, enter it, inspect logs, and return.',
          steps: [
            { title: 'Step 1 - orient', desc: 'pwd && ls ~ to orient.' },
            { title: 'Step 2 - enter project', desc: 'cd ~/projects/demo && ls -la.' },
            { title: 'Step 3 - inspect log', desc: 'cd logs && ls -lh app.log.' },
            { title: 'Step 4 - jump back', desc: 'cd - to jump back to the previous directory.' },
            { title: 'Step 5 - home', desc: 'cd .. repeatedly until home; verify with pwd.' },
          ],
          solution: 'You can move deliberately and prove where you are at every step.',
        },
        practice: {
          title: 'Path mental model',
          prompt: 'From /home/you/src, what does ../notes/../notes/../notes.txt resolve to? Write it out.',
          hint: 'Resolve one .. at a time from left to right.',
        },
        mistakes: [
          {
            mistake: 'rm -rf on a relative path while in the wrong directory',
            fix: 'pwd first; prefer absolute paths for destructive commands.',
          },
          {
            mistake: 'Ignoring -a and thinking a directory is empty',
            fix: 'Hidden files start with .; ls -a shows them.',
          },
        ],
        exam: {
          question: 'What do . and .. mean in a path?',
          answer: '. is the current directory; .. is its parent.',
          source: 'Most common Linux viva.',
        },
        summary: [
          'Absolute paths start at /; relative paths start at cwd.',
          'pwd/ls/cd are your map; tab-complete everything.',
          'Recursive delete is irreversible — prove the target first.',
        ],
      }),
      [
        [
          'cd - does:',
          ['Deletes a file', 'Returns to the previous working directory', 'Clears the screen', 'Changes to root'],
          1,
          'Oldpwd toggle.',
        ],
        [
          '~ expands to:',
          ['Root', 'Home of the current user', 'Temp', 'Current directory'],
          1,
          'Home directory.',
        ],
        [
          'mkdir -p a/b/c fails when:',
          ['a exists', 'Any intermediate exists without -p', 'You have no write permission on the leaf', 'It never fails'],
          2,
          'Permission on the deepest new directory.',
        ],
      ]
    ),
    lesson(
      M1,
      'lnx-1-2',
      1,
      'Files, Copy, Move and Permissions Intro',
      'cp, mv, rm, touch, and the first honest look at chmod and who owns a file.',
      12,
      nineBlocks({
        objectives: [
          'Copy, move and rename files and directories with correct flags',
          'Explain file ownership (user, group, other) and read ls -l mode strings',
          'Apply chmod numeric and symbolic modes for common needs',
        ],
        hook: 'Interviewers ask: "How do you give execute permission only to the owner?" If you can decode -rwxr-xr-- and answer with chmod u+x, you already sound like someone who has administered a box.',
        concept: `**Core file commands:**
- cp src dest, cp -r dir dest (directories)
- mv old new — rename or move; same filesystem is atomic rename
- rm file; rm -r dir
- touch file — create empty or update mtime
- file path — detect type when the extension lies

**ls -l anatomy:** -rwxr-xr-- user group size date name
- First char: type (- file, d directory, l symlink)
- Next nine: three triples user / group / other: r=4 w=2 x=1

**chmod:**
- Symbolic: chmod u+x script.sh, chmod go-w file (remove write from group/other)
- Numeric: chmod 755 dir-or-script (rwxr-xr-x), chmod 644 conf (rw-r--r--)
- Directories need x to enter (cd) and w to create children.

**Ownership:** chown user:group file (usually root). chgrp group file.

**umask** controls default create modes; do not memorize edge cases, know that it subtracts from 666/777.`,
        extras: [
          table('Common modes', ['Mode', 'Meaning'], [
            ['755', 'rwxr-xr-x — scripts, dirs you want others to enter'],
            ['644', 'rw-r--r-- — normal config/text files'],
            ['600', 'rw------- — private keys, secrets'],
            ['700', 'rwx------ — private dirs'],
          ]),
          tip(
            'Why scripts need +x',
            'A shebang script without execute bit fails with Permission denied until chmod u+x.',
          ),
        ],
        worked: {
          title: 'Secure a private key and a shared script',
          problem: 'Make id_rsa private and deploy.sh executable for the team.',
          steps: [
            { title: 'Step 1 - inspect modes', desc: 'ls -l id_rsa deploy.sh to see current modes.' },
            { title: 'Step 2 - lock the key', desc: 'chmod 600 id_rsa.' },
            { title: 'Step 3 - make script executable', desc: 'chmod 755 deploy.sh (or u+x if only you run it).' },
            { title: 'Step 4 - verify', desc: 'Verify with ls -l; modes show -rw------- and -rwxr-xr-x.' },
          ],
          solution: 'Key not readable by others; script runnable by the team.',
        },
        practice: {
          title: 'Mode decode',
          prompt: 'Decode -rw-r--r--. Which chmod numeric mode matches?',
          hint: 'Split into three triples of rwx.',
        },
        mistakes: [
          {
            mistake: 'chmod 777 "to make it work"',
            fix: 'World-writable is a security hole; use 755/644/600 deliberately.',
          },
          {
            mistake: 'cp without -r on a directory',
            fix: 'Fails or copies wrong; use cp -r for trees.',
          },
        ],
        exam: {
          question: 'What does chmod 755 mean?',
          answer: 'Owner rwx, group rx, other rx.',
          source: 'Permissions screening question.',
        },
        summary: [
          'cp/mv/rm are the file verbs; -r for directories.',
          'ls -l mode string = type + user + group + other triples.',
          'chmod 644 files, 755 scripts/dirs, 600 secrets — never reflex 777.',
        ],
      }),
      [
        [
          'Mode 644 is:',
          ['rwxr-xr-x', 'rw-r--r--', 'rw-------', 'rwxrwxrwx'],
          1,
          'Owner write; all read.',
        ],
        [
          'A directory needs the x bit to:',
          ['Be listed', 'Be entered (cd into)', 'Be deleted', 'Be compressed'],
          1,
          'Execute on a dir means traverse.',
        ],
        [
          'mv within the same filesystem is:',
          ['Always a copy then delete', 'A rename', 'A network op', 'Impossible'],
          1,
          'Same device: metadata rename.',
        ],
      ]
    ),
  ],
};
