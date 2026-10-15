// Module 4 — Shell Scripting Essentials
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Shell Scripting Essentials',
  summary:
    'Shebangs, variables, conditionals, loops, exit codes and a cron entry — enough bash to automate the boring half of your lab work.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'lnx-4-1',
      1,
      'Scripts, Variables and Conditions',
      'Write a real .sh file: shebang, set -euo pipefail, if/for, and exit codes that other tools trust.',
      12,
      nineBlocks({
        objectives: [
          'Structure a bash script with shebang, strict mode and functions',
          'Use variables, quoting and test/[ ] conditionals correctly',
          'Write for/while loops and return meaningful exit codes',
        ],
        hook: 'Twenty times a day you run the same three commands. A 15-line script with set -euo pipefail is the difference between a junior and someone whose work multiplies.',
        concept: `**Skeleton:**
#!/usr/bin/env bash
set -euo pipefail
# -e exit on error; -u unset vars are errors; -o pipefail: any pipe stage fails

**Variables:** NAME=value (no spaces). Use "\$NAME" always. Read input: read -r name. Positionals: \$1 \$2, \$@ all args. Special: \$? last exit code.

**Conditionals:**
if [[ -f file ]]; then ...; elif [[ "\$x" == "y" ]]; then ...; else ...; fi
Tests: -f file, -d dir, -e exists, -z empty, -n nonempty, [[ a == b ]], [[ a -lt b ]]

**Loops:**
for f in *.log; do echo "\$f"; done
while read -r line; do ...; done < file
for ((i=0; i<3; i++))

**Functions:** name() { ...; } — call with name arg1.

**Exit codes:** exit 0 success; non-zero failure. if command; then uses the code. Keep scripts honest: nonzero on real failure so cron/email alerts work.

**chmod +x script.sh** then ./script.sh.`,
        extras: [
          table('Strict flags', ['Flag', 'Why it matters'], [
            ['set -e', 'Stop on first failing command'],
            ['set -u', 'Typo in a variable name fails loudly'],
            ['set -o pipefail', 'Middle of a pipeline failing is not hidden'],
          ]),
          tip(
            'Quote everything',
            'Files with spaces break unquoted scripts; "\\$var" is muscle memory.',
          ),
          warn(
            'set -e is not a complete error strategy',
            'Still handle expected failures explicitly; learn when && and if guard a command.',
          ),
        ],
        worked: {
          title: 'Back up and rotate logs',
          problem: 'A script that gzips today\'s log and keeps the last 7 copies.',
          steps: [
            { title: 'Step 1 - skeleton', desc: 'Write backup.sh with shebang and set -euo pipefail.' },
            {
              title: 'Step 2 - paths',
              desc: 'SRC="/var/log/app.log"; DEST="/backup/$(date +%F).log.gz".',
            },
            { title: 'Step 3 - compress', desc: 'gzip -c "$SRC" > "$DEST".' },
            { title: 'Step 4 - retention', desc: 'find /backup -name "*.log.gz" -mtime +7 -delete.' },
            { title: 'Step 5 - run and verify', desc: 'chmod +x backup.sh; run; verify with ls -lh /backup.' },
          ],
          solution: 'Repeatable backup with retention; safe under strict mode.',
        },
        practice: {
          title: 'Arg-parsing mini',
          prompt: 'Script that takes a directory argument, prints how many .txt files it has; exits 2 if no arg.',
          hint: 'dir="$1"; if [[ -z "${1:-}" ]]; then exit 2; fi; ls "$dir"/*.txt | wc -l',
        },
        mistakes: [
          {
            mistake: 'Unquoted variables',
            fix: 'Always "$var"; word-splitting is the classic silent bug.',
          },
          {
            mistake: 'Ignoring exit codes in scripts used by cron',
            fix: 'If failure looks like success, nobody gets paged.',
          },
        ],
        exam: {
          question: 'What does set -euo pipefail do in one sentence?',
          answer: 'Makes the script abort on errors, unset variables, and failed pipeline stages.',
          source: 'Scripting interview / code review question.',
        },
        summary: [
          'Shebang + set -euo pipefail first.',
          'Quote "$var"; use [[ ]]; exit with real codes.',
          'for/while and functions cover most automation.',
        ],
      }),
      [
        [
          'set -u causes:',
          ['No effect', 'Exit when an unset variable is referenced', 'Unicode mode', 'Sudo only'],
          1,
          'Unbound variable error.',
        ],
        [
          'In bash, [[ -f file ]] tests:',
          ['file is a regular file', 'file is a folder', 'file is readable only', 'file is empty'],
          0,
          '-f means file exists and is regular.',
        ],
        [
          'Exit code 0 from a script means:',
          ['Failure', 'Success', 'Not implemented', 'Cancelled'],
          1,
          'POSIX success.',
        ],
      ]
    ),
    lesson(
      M4,
      'lnx-4-2',
      2,
      'Automation: Cron, Chmod and Real Habit',
      'Schedule work, make scripts safe to share, and build a personal ops checklist.',
      11,
      nineBlocks({
        objectives: [
          'Install a user crontab and read system cron layout',
          'Harden scripts for sharing (chmod, quoting, logging)',
          'Apply a short pre-flight checklist before running anything destructive',
        ],
        hook: 'Cron is the oldest "cloud function" in the industry. Nightly backups, log rotation and report emails still run there on fleets that also run Kubernetes — the mental model transfers.',
        concept: `**User crontab:**
- crontab -e — edit; crontab -l — list; crontab -r — remove (careful)
- Format: minute hour day month weekday command
- Example daily 02:15: 15 2 * * * /home/you/backup.sh >> /home/you/backup.log 2>&1
- % in the command is special in cron — avoid or escape

**System layout:** /etc/cron.d/, /etc/cron.daily/ — root-managed; know they exist.

**Logs:** cron mail or your own >> logfile. Silent cron is how backups "have always been fine" until they were not.

**Hardening before you share a script:**
- set -euo pipefail; quote vars; no secrets hard-coded (use env or a 600 config)
- chmod 755 scripts; chmod 600 secrets
- Prefer absolute paths inside cron jobs (PATH is minimal in cron)

**Pre-flight checklist for destructive ops:**
1. pwd and echo the target path
2. Dry-run if the tool supports it
3. Backup or snapshot
4. Then run
5. Verify with a read-only command

**Where to go next:** man 7 bash for signals/job control; shellcheck for linting your scripts.`,
        extras: [
          table('Cron fields', ['Cron field', 'Values', 'Example meaning'], [
            ['minute', '0-59', '15 = quarter past'],
            ['hour', '0-23', '2 = 2 AM'],
            ['day of month', '1-31', '* = every'],
            ['month', '1-12', '* = every'],
            ['weekday', '0-7 (0 and 7 = Sunday)', '5 = Friday'],
          ]),
          tip(
            'Install shellcheck',
            'Catches quoting and portability bugs before production does.',
          ),
          warn(
            'crontab -r deletes your whole crontab',
            'No confirm; dump crontab -l to a file first if you care.',
          ),
        ],
        worked: {
          title: 'Nightly backup cron',
          problem: 'Run backup.sh every day at 02:15 with a log.',
          steps: [
            { title: 'Step 1 - backup crontab', desc: 'crontab -l > /tmp/cron.bak to save current entries.' },
            {
              title: 'Step 2 - install entry',
              desc: 'crontab -e and add: 15 2 * * * /home/you/backup.sh >> /home/you/backup.log 2>&1.',
            },
            {
              title: 'Step 3 - test fast if needed',
              desc: 'Wait or temporarily use * * * * * for a test minute.',
            },
            { title: 'Step 4 - confirm log', desc: 'cat /home/you/backup.log to confirm it fired.' },
            {
              title: 'Step 5 - restore schedule',
              desc: 'Restore normal schedule; keep /tmp/cron.bak updated.',
            },
          ],
          solution: 'Scheduled job with a paper trail.',
        },
        practice: {
          title: 'Checklist dry-run',
          prompt: 'Write the five pre-flight steps you would run before rm -rf on an old build directory.',
          hint: 'pwd; ls absolute path; du -sh; backup if needed; then rm.',
        },
        mistakes: [
          {
            mistake: 'Cron jobs without absolute paths',
            fix: 'cron has a tiny PATH; scripts that work interactively fail silently otherwise.',
          },
          {
            mistake: 'No logging on scheduled jobs',
            fix: 'When it fails at 2 AM you need the log, not hope.',
          },
        ],
        exam: {
          question: 'Write a cron line for every Sunday at 03:00.',
          answer: '0 3 * * 0 /path/to/job',
          source: 'Automation question.',
        },
        summary: [
          'crontab -e for schedules; always log output.',
          'Quote, strict mode, no hard-coded secrets before sharing.',
          'Pre-flight checklist before any destructive command.',
        ],
      }),
      [
        [
          'Crontab entry "0 3 * * 0" runs:',
          ['Daily at 3 AM', 'Sundays at 3 AM', 'Every 3 hours', 'March only'],
          1,
          'weekday 0 = Sunday.',
        ],
        [
          'Inside cron jobs you should prefer:',
          ['Relative paths only', 'Absolute paths', '~ alone', 'Interactive prompts'],
          1,
          'Minimal PATH in cron.',
        ],
        [
          'shellcheck is used to:',
          ['Format videos', 'Lint shell scripts for common bugs', 'Restart cron', 'Encrypt files'],
          1,
          'Static analysis for bash.',
        ],
      ]
    ),
  ],
};
