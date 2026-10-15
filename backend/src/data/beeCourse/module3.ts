// Module 3 — AC Fundamentals
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — AC Fundamentals',
  summary:
    'Sinusoidal sources, phasors, RLC impedance and power factor — the AC language of every machines course.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'bee-3-1',
      1,
      'Phasors and RLC Impedance',
      'Represent sinusoids as complex numbers and solve AC circuits like DC with impedances.',
      11,
      nineBlocks({
        objectives: [
          'Convert between time-domain sinusoids and phasor form',
          'Compute impedance of R, L and C at a given frequency',
          'Solve a series RLC circuit for current and voltages',
        ],
        hook: 'AC analysis by differential equations is painful; by phasors it is algebra. One transform turns calculus into the DC methods you already know.',
        concept: `**Sinusoid:** v(t) = V_m cos(ωt + φ). Phasor: V = V_m ∠φ (rms phasors use V_rms). Frequency ω = 2πf.

**Impedance:** Z_R = R; Z_L = jωL; Z_C = 1/(jωC) = −j/(ωC). Impedances add in series and combine in parallel exactly like resistors, but with complex arithmetic.

**Series RLC:** Z = R + j(ωL − 1/(ωC)). Resonance when ωL = 1/(ωC), i.e. ω₀ = 1/√(LC). At resonance the impedance is purely resistive and current is maximum for a voltage source.

**Admittance:** Y = 1/Z = G + jB, convenient for parallel branches.`,
        extras: [
          table('Element impedances', ['Element', 'Z', 'Phase of current vs voltage'], [
            ['Resistor', 'R', 'In phase'],
            ['Inductor', 'jωL', 'Current lags voltage by 90°'],
            ['Capacitor', '−j/(ωC)', 'Current leads voltage by 90°'],
          ]),
          tip(
            'RMS phasors for power',
            'Power formulas use RMS, not peak. Convert V_m to V_rms = V_m/√2 before applying P = VI cosφ.',
          ),
        ],
        worked: {
          title: 'Series RLC current',
          problem: 'v(t) = 100√2 cos(377t) V drives R=3, L such that ωL=4, C such that 1/(ωC)=1. Find I phasor.',
          steps: [
            { title: 'Phasor voltage', desc: 'Use RMS: 100 ∠0 V (peak 100√2).' },
            { title: 'Total impedance', desc: 'Z = 3 + j4 − j1 = 3 + j3 ohm.' },
            { title: 'Magnitude and angle', desc: '|Z| = 3√2 ≈ 4.24 ohm; angle 45°.' },
            { title: 'Current phasor', desc: 'I_rms = 100∠0 / (3+j3) ≈ 23.57 ∠−45° A.' },
          ],
          solution: 'I ≈ 23.57 ∠−45° A (RMS); current lags voltage by 45°.',
        },
        practice: {
          title: 'Find resonance frequency',
          prompt: 'L = 10 mH, C = 100 µF. Compute f₀ in Hz.',
          hint: 'f₀ = 1/(2π√(LC)).',
        },
        mistakes: [
          {
            mistake: 'Using peak values in power formulas',
            fix: 'P = V_rms I_rms cosφ. Peak overstates power by a factor of 2.',
          },
          {
            mistake: 'Sign error on capacitive reactance',
            fix: 'X_C = −1/(ωC) in impedance; the magnitude is positive but the complex term is negative-j.',
          },
        ],
        exam: {
          question: 'Define impedance and state the impedance of an inductor and capacitor.',
          answer: 'Z = V/I (complex). Z_L = jωL; Z_C = 1/(jωC) = −j/(ωC).',
          source: 'Opening AC unit question.',
        },
        summary: [
          'Phasors convert AC algebra into DC-like complex arithmetic.',
          'Z_L = jωL leads; Z_C = −j/(ωC) lags in impedance form.',
          'Resonance: ωL = 1/(ωC), purely resistive Z, max current.',
        ],
      }),
      [
        [
          'Impedance of a capacitor is:',
          ['jωC', '−j/(ωC)', '1/R', 'j/(ωC)'],
          1,
          'Z_C = 1/(jωC) = −j/(ωC).',
        ],
        [
          'At resonance, series RLC impedance is:',
          ['Zero', 'Purely resistive R', 'Infinite', 'Purely inductive'],
          1,
          'Reactive parts cancel.',
        ],
        [
          'Current in a pure inductor ______ the voltage by:',
          ['Leads 90°', 'Lags 90°', 'In phase', 'Lags 45°'],
          1,
          'V leads I by 90° in an inductor.',
        ],
      ]
    ),
    lesson(
      M3,
      'bee-3-2',
      2,
      'AC Power and Power Factor',
      'Real, reactive and apparent power; the power triangle; why factories install capacitor banks.',
      10,
      nineBlocks({
        objectives: [
          'Compute real (P), reactive (Q) and apparent (S) power',
          'Determine power factor and the phase angle from impedance',
          'Explain power-factor correction with a parallel capacitor',
        ],
        hook: 'An industrial consumer with pf = 0.6 draws more current for the same real power and pays penalties. Sizing a capacitor bank is a standard BEE problem — and a real job task.',
        concept: `**Apparent power:** S = V_rms · I_rms (VA). **Real power:** P = S · cosφ = VI cosφ (W) — the useful work. **Reactive power:** Q = S · sinφ (VAR) — energy shuttled between source and reactive elements. **Power factor:** cosφ = P/S, lagging if current lags (inductive), leading if current leads (capacitive).

**Power triangle:** S² = P² + Q². Raise pf by adding capacitive Q (cancels inductive Q).

**Correction sizing:** Q_c = P (tanφ₁ − tanφ₂), C = Q_c / (ω V²).

**Three-phase:** P = √3 V_L I_L cosφ for balanced loads.`,
        extras: [
          table('Power quantities', ['Symbol', 'Unit', 'Meaning'], [
            ['P', 'W', 'Real, work-producing'],
            ['Q', 'VAR', 'Reactive exchange'],
            ['S', 'VA', 'Vector sum magnitude'],
            ['cosφ', '—', 'Efficiency of power delivery'],
          ]),
          tip(
            'Lagging pf means inductive load',
            'Motors lag; capacitor banks bring pf back toward unity.',
          ),
        ],
        worked: {
          title: 'Power-factor correction',
          problem: 'A 10 kW load at pf 0.6 lagging (50 Hz, 230 V) is corrected to 0.95 lagging. Find the required capacitor kVAR and µF.',
          steps: [
            { title: 'Existing phase angle', desc: 'φ₁ = acos(0.6) = 53.13°, tanφ₁ = 1.333.' },
            { title: 'Target phase angle', desc: 'φ₂ = acos(0.95) = 18.19°, tanφ₂ = 0.329.' },
            { title: 'Required kVAR', desc: 'Q_c = 10 × (1.333 − 0.329) = 10.04 kVAR.' },
            { title: 'Capacitance', desc: 'C = Q_c / (ω V²) = 10040 / (314.16 × 230²) ≈ 602 µF.' },
          ],
          solution: 'Q_c ≈ 10 kVAR; C ≈ 600 µF at 230 V, 50 Hz.',
        },
        practice: {
          title: 'Apparent power from P and pf',
          prompt: 'P = 8 kW, pf = 0.8 lagging. Find S and Q.',
          hint: 'S = P/cosφ; Q = √(S²−P²).',
        },
        mistakes: [
          {
            mistake: 'Using peak voltage in S = VI',
            fix: 'Always RMS for apparent and real power.',
          },
          {
            mistake: 'Wrong sign on corrected Q',
            fix: 'Capacitors supply VARs — they subtract from inductive Q.',
          },
        ],
        exam: {
          question: 'Define power factor and state why industries correct it.',
          answer: 'cosφ = P/S. Correction reduces current (I²R losses, tariff penalties) for the same real power.',
          source: 'Frequent 6-mark description + numerical.',
        },
        summary: [
          'S = VI (VA); P = VI cosφ; Q = VI sinφ.',
          'Power factor correction adds capacitive VARs to cancel inductive VARs.',
          'Three-phase balanced: P = √3 V_L I_L cosφ.',
        ],
      }),
      [
        [
          'Unit of reactive power is:',
          ['W', 'VA', 'VAR', 'Wh'],
          2,
          'Volt-ampere reactive.',
        ],
        [
          'A lagging power factor indicates a ______ load.',
          ['Capacitive', 'Inductive', 'Resistive', 'Resonant'],
          1,
          'Current lags voltage in inductors.',
        ],
        [
          'Balanced three-phase real power is:',
          ['3 VI cosφ', '√3 V_L I_L cosφ', 'VI cosφ', 'V²/R'],
          1,
          'Using line values.',
        ],
      ]
    ),
  ],
};
