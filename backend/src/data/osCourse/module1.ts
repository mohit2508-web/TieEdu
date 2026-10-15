// Module 1 — Processes & CPU Scheduling
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — Processes & CPU Scheduling',
  summary:
    'Process vs program, PCB, states, context switch, threads, and the five classic scheduling algorithms with Gantt charts.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'os-1-1',
      1,
      'Processes, States and Threads',
      'What a process is, the PCB, the five-state model, and how threads share address space.',
      12,
      nineBlocks({
        objectives: [
          'Distinguish a program from a process and list PCB contents',
          'Draw the five-state process model and explain each transition',
          'Compare process vs thread and name shared vs private resources',
        ],
        hook: 'Interview opener: "What is the difference between a process and a thread?" If you say "thread is lighter" without naming the shared address space, you lose half the marks. This lesson builds the model examiners actually want.',
        concept: `**Program vs process:** A program is passive text on disk. A process is a program in execution with its own address space, registers and kernel resources. One program → many concurrent processes.

**PCB (Process Control Block):** the kernel's identity card for a process — PID, process state, program counter, CPU registers, memory-management info, accounting, I/O status.

**Five-state model:**
1. **New** — admitted, not yet admitted to ready queue
2. **Ready** — waiting for CPU
3. **Running** — instructions executing on a CPU
4. **Waiting/Blocked** — waiting for I/O or an event
5. **Terminated** — finished; PCB reclaimed

Transitions: admit → ready; dispatch → running; I/O wait → waiting; I/O done → ready; exit → terminated. Preemption: running → ready (time slice over).

**Context switch:** save state of current process, load state of next. Pure overhead — no useful work. Cost grows with address-space size (more to swap) and with TLB flushes on some architectures.

**Threads:** a thread is a unit of schedulability inside a process.
- Shared: code, data, heap, open files, signal handlers
- Private: thread ID, program counter, registers, stack, errno

User-level threads are invisible to the kernel (one blocking call blocks all). Kernel-level threads are scheduled independently. Java's default model is 1:1 kernel threads on modern JVMs.`,
        extras: [
          table('State', ['Meaning / waiting for'], [
            ['New', 'Created; not in ready queue yet'],
            ['Ready', 'CPU; only the scheduler decides'],
            ['Running', 'On a CPU core'],
            ['Waiting', 'I/O or event; cannot run even if CPU free'],
            ['Terminated', 'Done; PCB not yet reaped (zombie parent case)'],
          ]),
          tip(
            'PCB is the exam keyword',
            'Any "what does the OS keep about a process" answer starts with PCB fields.',
          ),
          warn(
            'Confusing waiting with ready',
            'Waiting means no CPU will help until the event completes; ready means a dispatch will.',
          ),
        ],
        worked: {
          title: 'Trace a process through the five states',
          problem: 'A batch job is submitted, runs, issues a read, finishes.',
          steps: [
            { title: 'New', desc: 'Job admitted to the system after validation.' },
            { title: 'Ready', desc: 'PCB created; process sits in the ready queue.' },
            { title: 'Running', desc: 'Scheduler dispatches it to a core.' },
            { title: 'Waiting', desc: 'Execute read(fd); blocked until interrupt completes.' },
            { title: 'Ready again', desc: 'I/O interrupt; process requeued.' },
            { title: 'Running', desc: 'Second dispatch; reaches exit.' },
            { title: 'Terminated', desc: 'Exit status stored for the parent wait().' },
          ],
          solution: 'Full lifecycle; every transition has a reason (admit, dispatch, I/O, interrupt, exit).',
        },
        practice: {
          title: 'Thread resource map',
          prompt: 'List three resources shared by threads of one process and three that stay private to each thread.',
          hint: 'Shared follows the address space; private follows the execution context.',
        },
        mistakes: [
          {
            mistake: 'Saying a thread has its own address space',
            fix: 'Threads share the process address space; only stacks/registers differ.',
          },
          {
            mistake: 'Calling context switch free because "the OS does it"',
            fix: 'It is pure overhead: save/load + possible TLB shootdown.',
          },
        ],
        exam: {
          question: 'PCB vs program?',
          answer:
            'A program is passive code; a PCB is the runtime record the kernel keeps for each process (PID, state, PC, registers, memory, I/O).',
          source: 'Most repeated OS interview question.',
        },
        summary: [
          'Process = program in execution; PCB is its kernel identity.',
          'Five states; waiting is not ready.',
          'Threads share address space; stacks and registers are private.',
        ],
      }),
      [
        [
          'A process differs from a program mainly by:',
          ['Being written in C', 'Being in execution with runtime state', 'Living on disk', 'Having a .exe extension'],
          1,
          'Execution + PCB + address space.',
        ],
        [
          'Which is NOT typically private to a thread?',
          ['Stack', 'Program counter', 'Heap of the process', 'Registers'],
          2,
          'Heap is process-wide.',
        ],
        [
          'A process moves from Running to Waiting when it:',
          ['Is preempted', 'Requests I/O and blocks', 'Is created', 'Exits'],
          1,
          'Blocking I/O or event.',
        ],
      ]
    ),
    lesson(
      M1,
      'os-1-2',
      2,
      'Scheduling Algorithms',
      'FCFS, SJF, SRTF, Round Robin and Priority — turnaround, waiting, and Gantt charts.',
      13,
      nineBlocks({
        objectives: [
          'Compute average waiting and turnaround time for FCFS, SJF, SRTF and RR',
          'Explain preemption vs non-preemption and starvation in priority scheduling',
          'Choose an algorithm given a stated criterion (throughput, response, fairness)',
        ],
        hook: 'Campus OS papers open with a Gantt chart question. Four processes, four arrival times, one waiting-time average. The students who win marks have a fixed procedure — not vibes. This lesson is that procedure.',
        concept: `**Metrics (memorize the formulas):**
- Turnaround time = completion − arrival
- Waiting time = turnaround − burst
- Response time = first run − arrival (RR cares about this)

**FCFS (non-preemptive):** order of arrival. Simple; convoy effect — one long job blocks short ones behind it.

**SJF (non-preemptive):** shortest burst next. Optimal average waiting if bursts known. Needs future knowledge (estimates via exponential average).

**SRTF (preemptive SJF):** if a new job arrives with shorter remaining burst, preempt. Best average waiting in theory; can starve long jobs.

**Round Robin:** time quantum q. Circular ready queue; each runs at most q then goes to the back (if not finished). Response time bounded. Small q → many switches (overhead); large q → degrades to FCFS. Typical q = 10–100ms, larger than context-switch cost by an order of magnitude.

**Priority:** highest priority first. Preemptive or not. Starvation risk → aging (gradually boost waiting jobs).

**Multilevel feedback queues:** several ready queues by priority; a job that uses too much CPU is demoted; I/O-heavy jobs stay high. Adaptive without perfect burst knowledge.

**How to draw a Gantt chart:** timeline bar; at each decision point list arrivals that just joined; apply the algorithm rule; record completion times; fill the table.`,
        extras: [
          table('Algorithm', ['Preemptive?', 'Weakness'], [
            ['FCFS', 'No', 'Convoy effect'],
            ['SJF', 'No', 'Needs burst estimates; starvation'],
            ['SRTF', 'Yes', 'Starvation of long jobs'],
            ['Round Robin', 'Yes (by quantum)', 'Overhead if q too small'],
            ['Priority', 'Optional', 'Starvation without aging'],
          ]),
          tip(
            'SJF for average waiting, RR for response',
            'Exams often ask "which minimizes average waiting?" → SJF/SRTF. "Which bounds response?" → RR.',
          ),
          warn(
            'Arrival time ≠ burst time',
            'Double-check the table columns before starting the Gantt chart.',
          ),
        ],
        worked: {
          title: 'FCFS waiting time (non-preemptive)',
          problem:
            'Processes P1–P4, arrival 0: bursts P1=7, P2=3, P3=1, P4=5 (all arrive at 0). Compute average waiting under FCFS (order P1,P2,P3,P4).',
          steps: [
            { title: 'Timeline', desc: 'P1 0–7, P2 7–10, P3 10–11, P4 11–16.' },
            { title: 'Waiting', desc: 'P1=0, P2=7−0=7, P3=10−0=10, P4=11−0=11.' },
            { title: 'Sum', desc: '0+7+10+11 = 28.' },
            { title: 'Average', desc: '28/4 = 7.0 ms.' },
            { title: 'Sanity', desc: 'Short P3 waited almost as long as P4 — convoy effect visible.' },
          ],
          solution: 'Average waiting = 7.0 ms under this FCFS order.',
        },
        practice: {
          title: 'SJF vs FCFS',
          prompt: 'Same four jobs, all at 0, SJF non-preemptive order. What is average waiting?',
          hint: 'Order by burst: P3(1), P2(3), P4(5), P1(7).',
        },
        mistakes: [
          {
            mistake: 'Forgetting arrivals after time 0 in RR',
            fix: 'At every quantum boundary, enqueue any new arrivals before the next dispatch.',
          },
          {
            mistake: 'Using completion time as waiting time',
            fix: 'Waiting = turnaround − burst; always subtract burst.',
          },
        ],
        exam: {
          question: 'Which CPU scheduling algorithm gives the minimum average waiting time (non-preemptive, known bursts)?',
          answer: 'Shortest Job First (SJF).',
          source: 'Standard OS exam one-liner.',
        },
        summary: [
          'Memorize turnaround/waiting/response formulas.',
          'SJF wins average waiting; RR wins response; priority needs aging.',
          'Gantt chart first, table second — never the reverse.',
        ],
      }),
      [
        [
          'Round Robin is preferred when the goal is:',
          ['Minimum average waiting', 'Fair response / time-sharing', 'Maximum throughput only', 'No context switches'],
          1,
          'Bounded response time.',
        ],
        [
          'Starvation in priority scheduling is mitigated by:',
          ['Aging', 'A larger time quantum', 'FCFS', 'More CPUs only'],
          0,
          'Boost priority over wait time.',
        ],
        [
          'Waiting time = turnaround − ______.',
          ['Arrival', 'Burst', 'Completion', 'Response'],
          1,
          'Burst is the useful work; the rest is wait.',
        ],
      ]
    ),
  ],
};
