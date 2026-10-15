// Module 4 — Frequency Response, Filters & Applications
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Frequency Response, Filters & Applications',
  summary:
    'Bode plots, ideal and practical filters, amplitude modulation/demodulation, and how signals-and-systems thinking shows up in communications and control.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'ss-4-1',
      1,
      'Bode Plots & Filter Design Basics',
      'Magnitude/phase response, straight-line Bode asymptotes for poles/zeros, cutoff and bandwidth, and first/second-order filter prototypes.',
      13,
      nineBlocks({
        objectives: [
          'Sketch magnitude Bode plots for first-order and second-order systems from pole/zero locations',
          'Read −3 dB cutoff, bandwidth and Q from a transfer function',
          'Match prototype filters (LPF/HPF/BPF) to passband/stopband specs',
        ],
        hook:
          'A Bode plot turns H(jω) from a wall of complex algebra into two pencil-and-paper lines. EE interviews love asking you to sketch one live — with poles at −2 and zeros at origin you should see the shape before you calculate anything.',
        concept: `**Frequency response:** H(jω) = |H(jω)|∠H(jω). Bode plots: log-frequency x-axis; magnitude in dB (20log10|H|); phase in degrees.

**Straight-line rules (single real pole/zero at ω = ωp):**
- Zero at origin (jω): +20 dB/decade slope, phase +90°.
- Pole at origin (1/jω): −20 dB/decade, phase −90°.
- Real zero (1 + jω/ωz): slope +20 dB/decade starting at ωz; phase 0 → +90°.
- Real pole (1/(1 + jω/ωp)): slope −20 dB/decade from ωp; phase 0 → −90°.
- Corner frequency = pole/zero location; actual curve is −3 dB at corner (asymptote meets here).

**Second-order (complex poles) — resonant shape:**
H(s) = ωn²/(s² + 2ζωn s + ωn²) (LPF prototype)
- ωn = natural frequency; ζ = damping.
- ζ < 1/√2 ⇒ peak (resonance) near ωn; peak height ~ 1/(2ζ√(1−ζ²)).
- Higher Q = 1/(2ζ) ⇒ sharper peak, longer ringing in time.
- Slope beyond ωn: −40 dB/decade (two poles).

**Filter prototypes:**
- LPF: pass |ω| < ωc; HPF: pass |ω| > ωc; BPF: pass ω1..ω2; BS/ notch: reject one band.
- Specs: passband ripple, stopband attenuation, transition width → order n (higher n = steeper, more components/group delay).
- Butterworth: maximally flat passband; Chebyshev: steeper transition with ripples; both all-pole classics.

**Decibels to remember:** −3 dB = half power (×0.707 voltage); −6 dB ≈ ×0.5 voltage; −20 dB/decade = one pole; −40 = two.`,
        extras: [
          table('Element', ['Mag slope', 'Phase'], [
            ['(jω)^k zero at 0', '+20k dB/dec', '+90k°'],
            ['1/(jω)^k pole at 0', '−20k dB/dec', '−90k°'],
            ['Real pole at ωp', '−20 from ωp', '0 → −90°'],
            ['Real zero at ωz', '+20 from ωz', '0 → +90°'],
            ['2nd-order poles', '−40 beyond ωn', '0 → −180°'],
          ]),
          tip(
            'Sketch order of operations',
            'Mark all corners on the log axis → start from DC slope (poles/zeros at origin) → add slope changes left to right → fix phase ends.',
          ),
          warn(
            'Bode asymptotes are approximate near corners',
            'Read the −3 dB point from the real curve, not the sharp asymptote kink.',
          ),
        ],
        worked: {
          title: 'Bode sketch: H(s) = 100/(s+10)',
          problem: 'First-order low-pass. Find DC gain, corner, asymptotic mag at 100 Hz and 1 Hz.',
          steps: [
            { title: 'Standard form', desc: 'H(s) = 10/(1 + s/10) — pole at ωp = 10 rad/s, DC gain 10 (20 dB).' },
            { title: 'Asymptotes', desc: 'Flat 20 dB below 10 rad/s; −20 dB/dec above. Phase: 0° → −45° at 10 → −90° high.' },
            { title: 'At ω = 1 (≈0.16 Hz)', desc: 'Well below corner: ≈ 20 dB (asymptote = exact here).' },
            { title: 'At ω = 100', desc: 'Two decades above corner: 20 − 40 = −20 dB asymptote; real ≈ −20.04 dB (near-exact).' },
            { title: 'At corner ω = 10', desc: 'Real curve: 20 − 3 = 17 dB — classic −3 dB cutoff.' },
          ],
          solution: 'DC 20 dB, fc = 10 rad/s (≈1.6 Hz), −20 dB/dec slope, −3 dB at corner.',
        },
        practice: {
          title: 'Second-order peak',
          prompt: 'H(s) = ωn²/(s² + 0.2ωn s + ωn²). Estimate Q and whether a magnitude peak appears.',
          hint: 'ζ = 0.1 ⇒ Q = 5 ⇒ strong resonance.',
        },
        mistakes: [
          {
            mistake: 'Using linear frequency decades on a log-sketch',
            fix: 'Decades = ×10 in frequency; half-decades must be spaced logarithmically on the axis.',
          },
          {
            mistake: 'Confusing −3 dB (half POWER) with half VOLTAGE',
            fix: 'Half voltage is ≈ −6 dB; −3 dB is 1/√2 in voltage, ½ in power.',
          },
        ],
        exam: {
          question: 'Sketch the magnitude Bode plot of a second-order low-pass and mark ωn, peak and high-frequency slope.',
          answer: 'Flat (0 dB ref) below ωn (gain 1); resonance peak near ωn if ζ < 0.707 (height ≈ 1/(2ζ) for small ζ); slope −40 dB/decade above ωn; phase 0° → −180°.',
          source: 'Frequent sketching question.',
        },
        summary: [
          'Bode = log-mag + phase vs log-ω; poles/zeros set slope breaks at corners.',
          'Second-order ζ/Q control resonance; two poles ⇒ −40 dB/dec.',
          'Filter prototypes: LPF/HPF/BPF/notch; order trades steepness vs ripple/delay.',
        ],
      }),
      [
        [
          'A single real pole contributes asymptotically:',
          ['+20 dB/dec above its corner', '−20 dB/dec above its corner', '−40 dB/dec everywhere', 'Flat then +10'],
          1,
          'Classic first-order roll-off.',
        ],
        [
          'The −3 dB cutoff corresponds to:',
          ['Half voltage gain', 'Half power gain', 'Zero phase', 'Tenfold attenuation'],
          1,
          'Power halves; voltage is 1/√2.',
        ],
        [
          'A very small damping ratio ζ means:',
          ['No resonance, heavy damping', 'Sharp resonance peak, high Q', 'Infinite bandwidth', 'Only phase effects'],
          1,
          'Q ≈ 1/(2ζ).',
        ],
      ]
    ),
    lesson(
      M4,
      'ss-4-2',
      2,
      'Modulation & System Applications',
      'Amplitude modulation as multiplication in time = frequency shift, DSB/SSB/envelope detection, and where LTI/transform thinking appears in comms, audio and control.',
      13,
      nineBlocks({
        objectives: [
          'Explain AM as multiplication by a carrier and sketch the spectrum before/after',
          'Distinguish DSB-SC, AM with carrier, and SSB; state the envelope-detection condition',
          'Map real products (radio, audio EQ, PID control) onto the course toolkit',
        ],
        hook:
          'AM radio is 100 years old and still one-line Fourier: multiply the message by cos(ωc t) and every station owns a different spectral real-estate band. Learn this and "how does the radio know which song is theirs" becomes a five-second answer.',
        concept: `**Amplitude modulation = multiplication in time:**
s(t) = m(t)·cos(ωc t) ⇒ S(jω) = ½[M(ω − ωc) + M(ω + ωc)] — spectrum COPIED to ±ωc (frequency-shift property).

**Variants:**
- **DSB-SC** (double sideband, suppressed carrier): s = m·cos(ωc t). Compact power, needs coherent (synchronous) detection.
- **Conventional AM** (with carrier): s = [A + m(t)]cos(ωc t), A large enough that A + m(t) ≥ 0. Envelope = A + m(t) — detectable by a simple diode + LPF (envelope detector). Wasteful (carrier power) but cheap receivers — classic broadcast trade.
- **SSB** (single sideband): transmit only one sideband (filter method or phase method). Half bandwidth, harder to generate — telephony/fax heritage.
- **Vestigial / FM** — beyond this course's core; FM is angle modulation (constant envelope, noise-robust).

**Envelope detection condition:** modulation index μ = max|m|/A < 1 (no overmodulation); otherwise envelope clips and audio distorts. RC time constant: 1/ωc ≪ RC ≪ 1/Wm (carrier passes, message follows).

**Coherent detection:** multiply by local cos(ωc t) and LPF — recovers m(t)/2 (plus a DC/IF offset term if frequencies mismatch).

**Where the whole course shows up in products:**
- **Audio EQ / crossovers:** banks of biquad filters = H(s) prototypes; Bode plot tuning in DAWs.
- **Digital audio/OFDM:** sampling theorem + FFT; guard intervals combat ISI (channel impulse response spread).
- **PID control:** Laplace transfer functions of plant + controller; pole placement = closed-loop stability (LHP again).
- **Medical/telemetry sensors:** anti-alias filtering before ADC; envelope detectors in amplitude-based sensing.
- **JPEG/MPEG:** 2D frequency transforms — "which frequencies carry the picture" is still spectral thinking.

**Exam angle:** problems usually chain transforms: model → transform (Laplace/z/FT) → algebraic solve (multiply/divide) → inverse → interpret (stability, bandwidth, aliasing).`,
        extras: [
          table('Scheme', ['Bandwidth', 'Detection'], [
            ['Conventional AM', '2Wm', 'Envelope diode (cheap)'],
            ['DSB-SC', '2Wm', 'Coherent only'],
            ['SSB', 'Wm', 'Coherent / phasing method'],
          ]),
          tip(
            'Multiplication ⇔ frequency shift — always draw the spectrum',
            'In modulation questions, sketch M(ω) then its ±ωc copies before writing any algebra.',
          ),
          warn(
            'Overmodulation (μ > 1)',
            'Envelope no longer tracks the message — diode detectors clip; conventional AM must keep μ ≤ 1.',
          ),
        ],
        worked: {
          title: 'AM spectrum arithmetic',
          problem: 'm(t) band-limited to 3 kHz; carrier 1 MHz. Bandwidth of conventional AM? DSB-SC? SSB?',
          steps: [
            { title: 'DSB copies', desc: 'm spectrum ±ωc ⇒ occupied band 1 MHz ± 3 kHz — total width 6 kHz (2Wm).' },
            { title: 'Conventional AM', desc: 'Same sidebands plus discrete carrier at 1 MHz — same 6 kHz RF bandwidth, extra carrier power.' },
            { title: 'SSB', desc: 'Filter out one sideband: only 3 kHz of spectrum used (Wm).' },
            { title: 'Receiver cost', desc: 'AM envelope diode = pennies; SSB/DSB need local oscillator + coherent mixer.' },
            { title: 'Takeaway', desc: 'Broadcast chose AM-with-carrier historically for cheap receivers, not spectral efficiency.' },
          ],
          solution: 'AM/DSB-SC: 6 kHz; SSB: 3 kHz for the same message bandwidth.',
        },
        practice: {
          title: 'Detection condition',
          prompt: 'Carrier amplitude 5 V; message peak 8 V. What happens with an envelope detector, and the fix?',
          hint: 'μ = 8/5 > 1.',
        },
        mistakes: [
          {
            mistake: 'Saying AM multiplies "the frequencies" without drawing copies',
            fix: 'Multiplication by cos shifts the WHOLE spectrum to ±ωc and scales by ½ — draw it.',
          },
          {
            mistake: 'Assuming any AM signal can use a diode detector',
            fix: 'Envelope detection needs μ ≤ 1 and a carrier component; DSB-SC needs coherent detection.',
          },
        ],
        exam: {
          question: 'Explain how amplitude modulation illustrates the frequency-shift property of the Fourier transform, and give the envelope-detection condition.',
          answer: 'Multiplication by cos(ωc t) shifts M(ω) to ±ωc (scaled by ½) — the frequency-shift property. Envelope detection of conventional AM works only if modulation index μ = max|m|/A ≤ 1 so the envelope A+m(t) never goes negative.',
          source: 'Standard comms application question.',
        },
        summary: [
          'AM = time multiplication ⇒ spectral copies at ±ωc; bandwidth 2Wm (SSB: Wm).',
          'Conventional AM (μ ≤ 1) enables cheap envelope detectors; DSB-SC/SSB trade receiver complexity for power/bandwidth.',
          'Sampling, filtering, modulation, control — one transform toolkit across the product stack.',
        ],
      }),
      [
        [
          'm(t)cos(ωc t) has spectrum:',
          ['M(ω) scaled only', 'Copies of M at ±ωc, scaled by ½', 'M(ω)·M(ωc)', 'Impulses only'],
          1,
          'Frequency-shift property.',
        ],
        [
          'Envelope detection fails when:',
          ['Carrier frequency is low', 'Modulation index μ > 1', 'Message is digital', 'RC is very small'],
          1,
          'Overmodulation clips the envelope.',
        ],
        [
          'For same message bandwidth Wm, SSB bandwidth is:',
          ['2Wm', 'Wm', '4Wm', 'Wm/2'],
          1,
          'One sideband only.',
        ],
      ]
    ),
  ],
};
