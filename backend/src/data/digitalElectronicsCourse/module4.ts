// Module 4 — Sequential Circuits
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Sequential Circuits',
  summary:
    'Flip-flops, counters, registers and finite state machines — where digital logic gains memory and time.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'de-4-1',
      1,
      'Flip-Flops and Latches',
      'SR, D, JK and T flip-flops: characteristic tables, excitation and the clock edge.',
      11,
      nineBlocks({
        objectives: [
          'Distinguish a level-sensitive latch from an edge-triggered flip-flop',
          'Use the characteristic and excitation tables of D, JK and T',
          'Convert one flip-flop type into another via excitation mapping',
        ],
        hook: 'A CPU register file is thousands of identical D flip-flops clocked on the same edge. One cell, cloned — this lesson is that cell.',
        concept: `**Latch vs flip-flop:** a latch is level-sensitive (transparent while enable is high). A flip-flop samples on a clock edge (rising or falling) — the edge is what makes synchronous design predictable.

**SR latch:** S=1,R=1 is forbidden (race / invalid state). **D flip-flop:** Q follows D at the edge — the universal storage cell. **JK flip-flop:** J=K=1 toggles — solves the SR forbidden case. **T flip-flop:** T=1 toggles, T=0 holds — built from D with feedback.

**Characteristic table:** next state Q(t+1) from current inputs.
**Excitation table:** which inputs produce a desired Q→Q(t+1) — used when designing counters and FSMs.

**Asynchronous inputs:** preset (force 1) and clear (force 0) override the clock — used for initialization, not for logic.`,
        extras: [
          table('Characteristic equations', ['Flip-flop', 'Q(t+1)', 'Notes'], [
            ['D', 'D', 'Transparent-at-edge storage'],
            ['JK', 'J·Q̅ + K̅·Q', 'J=K=1 → toggle'],
            ['T', 'T⊕Q', 'T=1 toggles'],
            ['SR (gated)', 'S + R̅·Q', 'S=R=1 forbidden'],
          ]),
          tip(
            'Excitation table workflow for counters',
            'Write the state sequence, fill the required Q→Q(t+1) per bit, read the needed T or JK inputs from the table, then K-map the input logic.',
          ),
        ],
        worked: {
          title: 'Toggle with a D flip-flop',
          problem: 'Design a toggle stage using one D flip-flop.',
          steps: [
            {
              title: 'Desired behavior',
              desc: 'Q(t+1) = Q(t) when T=0, Q̅(t) when T=1.',
            },
            {
              title: 'Map to D',
              desc: 'D flip-flop: Q(t+1) = D, so D must equal the desired next state.',
            },
            {
              title: 'Feedback equation',
              desc: 'D = T̅·Q + T·Q̅ = T⊕Q.',
            },
          ],
          solution: 'D = T⊕Q — XOR the current Q with the toggle input.',
        },
        practice: {
          title: 'JK excitation for Q→Q̅',
          prompt: 'What J, K values force a toggle from any state?',
          hint: 'Look at the excitation table row for 0→1 and 1→0.',
        },
        mistakes: [
          {
            mistake: 'Using S=R=1 on an SR latch',
            fix: 'Forbidden — outputs race. Use JK or D instead.',
          },
          {
            mistake: 'Confusing async preset with sync logic',
            fix: 'Preset/clear ignore the clock; only use them for power-on reset.',
          },
        ],
        exam: {
          question: 'Convert a JK flip-flop into a D flip-flop.',
          answer: 'J = D, K = D̅.',
          source: 'Classic conversion question.',
        },
        summary: [
          'Edge-triggered flip-flops are the unit of synchronous design.',
          'D = next state; JK and T add toggle convenience.',
          'Excitation tables drive counter and FSM design.',
        ],
      }),
      [
        [
          'Q(t+1) for a D flip-flop equals:',
          ['Q', 'D', 'D̅', 'T⊕Q'],
          1,
          'Next state is simply D.',
        ],
        [
          'J=K=1 on a JK flip-flop causes:',
          ['Reset', 'Set', 'Toggle', 'Hold'],
          2,
          'Toggle mode.',
        ],
        [
          'A latch differs from a flip-flop by being:',
          ['Edge-triggered', 'Level-sensitive', 'Clocked only', 'Async only'],
          1,
          'Latches are transparent while enable is asserted.',
        ],
      ]
    ),
    lesson(
      M4,
      'de-4-2',
      2,
      'Counters, Registers and FSMs',
      'Ripple and synchronous counters, shift registers, and the two-process FSM template.',
      12,
      nineBlocks({
        objectives: [
          'Classify counters as ripple (async) or synchronous and state the trade-off',
          'Design a mod-N counter with proper wrap-around',
          'Sketch a Moore vs Mealy FSM and write its state table',
        ],
        hook: 'Every protocol parser, traffic light and UART bit-timer is an FSM plus a counter. Interviewers love "design a mod-6 counter" because it tests the whole sequential toolkit in one question.',
        concept: `**Ripple (async) counter:** each stage clocks from the previous Q — simple, but cumulative delay makes high-speed designs unsafe. **Synchronous counter:** all flip-flops share the clock; next-state logic is combinational — faster, slightly more gates.

**Mod-N counter:** counts 0..N−1 then wraps. For non-power-of-two N, detect the terminal count and force the reset/next-state.

**Shift registers:** serial-in/serial-out, serial-in/parallel-out — the basis of UART and delay lines. Johnson and ring counters are cyclic shift variants.

**Finite state machines:**
- **Moore:** outputs depend only on state — safer timing.
- **Mealy:** outputs depend on state AND inputs — often fewer states, glitch-prone at transitions.

**Design recipe:** states → state table → state assignment → excitation K-maps → circuit. Two-process VHDL/Verilog: sequential state register + combinational next-state/output.`,
        extras: [
          table('Counter comparison', ['Type', 'Clocking', 'Speed'], [
            ['Ripple / async', 'Each FF clocked by previous Q', 'Slow: delay accumulates'],
            ['Synchronous', 'All FFs on global clock', 'Fast: parallel next-state logic'],
          ]),
          tip(
            'Moore for safety, Mealy for speed of design',
            'Interview default: sketch Moore unless asked for Mealy. Moore outputs change only after the clock edge.',
          ),
          warn(
            'Unused states in FSM assignment',
            'Always decide: illegal-state detect + reset, or don’t-care in K-maps. Never leave them floating in a real design.',
          ),
        ],
        worked: {
          title: 'Mod-6 synchronous counter',
          problem: 'Design a 3-bit synchronous counter that counts 0..5 then wraps.',
          steps: [
            {
              title: 'Define the state sequence',
              desc: 'States: 000,001,010,011,100,101 then back to 000. States 110,111 unused.',
            },
            {
              title: 'Toggle conditions per bit',
              desc: 'T flip-flops: bit0 toggles every clock; bit1 when Q0=1; bit2 at count 3→4.',
            },
            {
              title: 'Minimize with don’t-cares',
              desc: 'K-map next-state logic treating 110/111 as don’t-cares yields minimal T2, T1, T0.',
            },
            {
              title: 'Wrap term',
              desc: 'Terminal detect: Q2·Q1·Q̅0 (count 5) forces next = 000.',
            },
          ],
          solution: 'Three T flip-flops plus AND-OR next-state logic; wrap at 101→000.',
        },
        practice: {
          title: 'State table for a traffic light',
          prompt: 'Three states (NS green, NS yellow, EW green) — write the state table and identify Moore vs Mealy outputs.',
          hint: 'Outputs change only when the state changes if Moore.',
        },
        mistakes: [
          {
            mistake: 'Ignoring unused states in counters',
            fix: 'Power-on may land in 110 — add auto-correct or rely on reset.',
          },
          {
            mistake: 'Mealy output glitches in interfaces',
            fix: 'For chip outputs prefer Moore; gate Mealy outputs with the clock if needed.',
          },
        ],
        exam: {
          question: 'Difference between Moore and Mealy machines?',
          answer: 'Moore outputs = f(state); Mealy outputs = f(state, inputs). Mealy reacts faster but can glitch on input changes.',
          source: 'Most-asked FSM interview question.',
        },
        summary: [
          'Synchronous counters beat ripple on speed; same state sequence.',
          'Mod-N: detect terminal count, wrap to zero.',
          'FSM design is table-driven; Moore for glitch-free outputs.',
        ],
      }),
      [
        [
          'Ripple counter delay is:',
          ['Zero', 'Cumulative across stages', 'One clock only', 'Independent of bits'],
          1,
          'Each stage waits for the previous Q edge.',
        ],
        [
          'Moore machine outputs depend on:',
          ['Inputs only', 'State only', 'State and inputs', 'Clock only'],
          1,
          'Output = f(state).',
        ],
        [
          'A mod-10 counter has how many states?',
          ['8', '10', '16', '32'],
          1,
          'Counts 0..9.',
        ],
      ]
    ),
  ],
};
