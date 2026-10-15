// Module 3 — Processes, Packages & Networking
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Processes, Packages & Networking',
  summary:
    'ps, top, kill signals, apt/dnf basics, ssh, curl, and diagnosing "is the port open or not".',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'lnx-3-1',
      1,
      'Processes and Services',
      'What is running, who owns it, how to stop it cleanly, and reading systemd status.',
      12,
      nineBlocks({
        objectives: [
          'List and filter processes with ps and understand PID/PPID',
          'Stop processes with kill signals SIGTERM vs SIGKILL correctly',
          'Read systemctl status and journalctl for a failing service',
        ],
        hook: 'Your Node app "hangs". Ctrl+C does nothing over SSH. You need kill -9 with a PID — and the sense to try SIGTERM first so the process can flush state.',
        concept: `**Seeing processes:**
- ps aux — all processes, classic columns (USER PID %CPU %MEM COMMAND)
- ps aux | grep node
- pidof name; pgrep pattern
- top / htop — live; sort by CPU/MEM; q quit
- /proc/PID/status, /proc/PID/cwd for the brave

**Signals:**
- kill PID — default SIGTERM (15): polite, lets the app clean up
- kill -9 PID — SIGKILL: cannot be caught; last resort; may leave locks/tmp files
- kill -HUP often reloads config for daemons that support it

**systemd:**
- systemctl start|stop|restart|status name
- systemctl enable name — start on boot
- journalctl -u name -n 50 --no-pager — recent logs
- journalctl -u name -f — follow

**Zombie / defunct:** dead child not reaped; usually parent bug; kill the parent carefully.

**Load vs CPU:** load average includes runnable + uninterruptible; a high load with low CPU often means I/O wait or stuck D-state.`,
        extras: [
          table('Signals', ['Signal', 'Meaning', 'When'], [
            ['SIGTERM (15)', 'Ask to terminate', 'First try'],
            ['SIGKILL (9)', 'Forced kill', 'After TERM fails'],
            ['SIGHUP (1)', 'Hang up / reload', 'Config reload on many daemons'],
          ]),
          tip(
            'pgrep -af pattern',
            'Shows full command lines matching a name — better than grepping ps by hand.',
          ),
        ],
        worked: {
          title: 'Stop a stuck process safely',
          problem: 'A deploy script is frozen; stop it without rebooting.',
          steps: [
            { title: 'Step 1 - list', desc: 'pgrep -af deploy to list candidates with full args.' },
            { title: 'Step 2 - polite stop', desc: 'kill <pid>; wait 5s.' },
            { title: 'Step 3 - escalate', desc: 'kill -9 <pid> only if still alive.' },
            { title: 'Step 4 - cleanup check', desc: 'journalctl or app logs for leftover locks.' },
          ],
          solution: 'Process gone; clean shutdown preferred over hard kill when possible.',
        },
        practice: {
          title: 'Find and signal',
          prompt: 'List all processes owned by you matching "python", then send SIGTERM to the oldest.',
          hint: 'ps -u "$USER" | grep python; kill PID.',
        },
        mistakes: [
          {
            mistake: 'kill -9 as the first move',
            fix: 'Skips cleanup; try kill (TERM) first.',
          },
          {
            mistake: 'Killing by name with pkill when the name is too broad',
            fix: 'pkill python can hit unrelated jobs; prefer pgrep then kill PID.',
          },
        ],
        exam: {
          question: 'Difference between kill and kill -9?',
          answer: 'kill sends SIGTERM (graceful); kill -9 is SIGKILL (forced, no cleanup).',
          source: 'Process management interview staple.',
        },
        summary: [
          'ps/top/pgrep to see; kill then kill -9.',
          'systemctl + journalctl for services.',
          'Read load carefully — not always CPU.',
        ],
      }),
      [
        [
          'Default kill signal is:',
          ['SIGKILL', 'SIGTERM', 'SIGSTOP', 'SIGINT only'],
          1,
          'Polite terminate.',
        ],
        [
          'journalctl -u nginx shows:',
          ['Nginx config only', 'Logs for the nginx unit', 'Disk usage', 'Open ports'],
          1,
          'Systemd unit logs.',
        ],
        [
          'A defunct process means:',
          ['It is encrypted', 'Zombie not reaped by parent', 'It is root', 'It is in swap'],
          1,
          'Entry in process table after exit.',
        ],
      ]
    ),
    lesson(
      M3,
      'lnx-3-2',
      2,
      'Packages, SSH and Network Checks',
      'Install software with apt/dnf, ssh securely, and verify ports with curl/ss.',
      12,
      nineBlocks({
        objectives: [
          'Install and update packages with the distro package manager',
          'Use ssh with key auth; avoid password paste where possible',
          'Diagnose listeners and HTTP with ss, curl and simple DNS checks',
        ],
        hook: 'Campus cloud VMs are Linux. You will apt install, ssh in, open a port for a demo, and wonder why curl fails until you check the firewall. These three skills cover 90% of early cloud friction.',
        concept: `**Packages:**
- Debian/Ubuntu: sudo apt update && sudo apt install pkg; apt search; apt remove
- RHEL/Fedora: sudo dnf install pkg
- snap/flatpak exist; prefer distro packages when unsure
- Never blindly curl | sudo bash from unknown sources

**SSH:**
- ssh user@host; ssh -p 2222 user@host
- ssh-keygen -t ed25519; ssh-copy-id user@host; then key auth
- ~/.ssh/config host aliases; StrictHostKeyChecking is a security feature — understand before disabling
- scp file user@host:/path ; rsync -avz dir/ host:dir/

**Network checks:**
- ip a or hostname -I — your addresses
- ss -tulpn — listening TCP/UDP with process
- curl -v https://example.com — verbose HTTP
- curl -I — headers only; curl -o file — download
- ping, dig / nslookup for DNS
- wget as alternative downloader

**Firewall awareness:** ufw on Ubuntu (ufw allow 8080); cloud security groups are a second gate — both must allow traffic.`,
        extras: [
          table('Check', ['Check', 'Command', 'Asks'], [
            ['My IP', 'ip a', 'What address am I on?'],
            ['Listeners', 'ss -tulpn', 'Who is bound to a port?'],
            ['HTTP path', 'curl -v URL', 'Does the app answer?'],
            ['DNS', 'dig example.com', 'Does the name resolve?'],
          ]),
          tip(
            'Keys over passwords',
            'ssh-copy-id once; then disable password login when you control the box.',
          ),
          warn(
            'curl | sudo bash from random blogs',
            'You just gave strangers root. Prefer the distro package.',
          ),
        ],
        worked: {
          title: 'Why is my demo URL down?',
          problem: 'A student app returns connection refused from another machine.',
          steps: [
            {
              title: 'Step 1 - listeners',
              desc: 'On the server: ss -tulpn | grep 3000 — is anything listening?',
            },
            { title: 'Step 2 - start app if needed', desc: 'If not: start the app; recheck.' },
            {
              title: 'Step 3 - bind address',
              desc: 'If listening on 127.0.0.1 only: bind 0.0.0.0 for LAN demos (know the risk).',
            },
            { title: 'Step 4 - local curl', desc: 'curl -v http://localhost:3000 on the server.' },
            {
              title: 'Step 5 - remote curl + firewall',
              desc: 'From client: curl -v http://server-ip:3000; if fail, check ufw/security group.',
            },
          ],
          solution: 'Isolated whether it was app, bind address, or firewall.',
        },
        practice: {
          title: 'Package drill',
          prompt: 'On any Debian sandbox: apt update then install jq; verify with jq --version.',
          hint: 'You may need sudo.',
        },
        mistakes: [
          {
            mistake: 'App bound to localhost then confused why remote curl fails',
            fix: 'Listen on 0.0.0.0 for demos you intend others to reach; understand the exposure.',
          },
          {
            mistake: 'Opening a cloud security group but forgetting ufw (or vice versa)',
            fix: 'Both layers must allow the port.',
          },
        ],
        exam: {
          question: 'How do you list processes listening on TCP ports?',
          answer: 'ss -tulpn (or netstat -tulpn on older systems).',
          source: 'Network debug question.',
        },
        summary: [
          'apt/dnf for packages; prefer repos over random pipes to root.',
          'ssh keys; ss for listeners; curl -v for HTTP.',
          'Cloud + host firewalls are two gates — check both.',
        ],
      }),
      [
        [
          'ss -tulpn primarily shows:',
          ['File permissions', 'Listening sockets and owning processes', 'Disk usage', 'User passwords'],
          1,
          'Network state.',
        ],
        [
          'Best practice for remote login is:',
          ['Shared password in chat', 'SSH key authentication', 'Telnet', 'Open SSH to the world with root password'],
          1,
          'Key-based auth.',
        ],
        [
          'apt update does:',
          ['Upgrade all packages', 'Refresh package index metadata', 'Remove packages', 'Start services'],
          1,
          'Index refresh; upgrade is separate.',
        ],
      ]
    ),
  ],
};
