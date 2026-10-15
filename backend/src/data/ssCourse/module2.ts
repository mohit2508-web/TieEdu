// Module 2 — Fourier Analysis & Sampling
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Fourier Analysis & Sampling',
  summary:
    'Fourier series (trig/exponential), Fourier transform pairs and properties, frequency response of LTI systems, and the sampling theorem.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'ss-2-1',
      1,
      'Fourier Series & Transform',
      'Decomposing periodic signals into harmonics, the transform for aperiodic signals, key pairs and the linearity/time/frequency-shift properties.',
      13,
      nineBlocks({
        objectives: [
          'Write trigonometric and exponential Fourier series for standard waveforms',
          'State the Fourier transform pair and compute it for rect and exp decays',
          'Apply linearity, time-shift and frequency-shift (modulation) properties',
        ],
        hook:
          'Fourier turned one hard problem (solving differential equations for arbitrary inputs) into easy ones (scale the response at each pure tone). Every filter, codec and modulation scheme you will ever meet is that idea in hardware.',
        concept: `**Fourier series (periodic, period T0, ω0 = 2π/T0):**
- Trig form: x(t) = a0/2 + Σ [aₙcos(nω0t) + bₙsin(nω0t)]
  - aₙ = (2/T0)∫ x(t)cos(nω0t)dt, bₙ similarly with sin.
- Exponential form (preferred): x(t) = Σ cₙ e^{jnω0t}
  - cₙ = (1/T0)∫_T x(t)e^{−jnω0t}dt; c₋ₙ = cₙ* for real x.
- Even signal ⇒ only cosine (bₙ=0); odd ⇒ only sine (aₙ=0); half-wave symmetry ⇒ only odd harmonics.

**Fourier transform (aperiodic, limit of series as T0→∞):**
X(jω) = ∫ x(t) e^{−jωt} dt;  x(t) = (1/2π)∫ X(jω)e^{jωt} dω

Key pairs to memorise:
- δ(t) ↔ 1
- 1 ↔ 2π δ(ω)
- e^{−at}u(t), a>0 ↔ 1/(a + jω)
- rect(t/T) ↔ T·sinc(ωT/2) (sampling form varies with sinc definition — be consistent)
- triangular pulse ↔ T·sinc²( )
- cos(ω0t) ↔ π[δ(ω−ω0) + δ(ω+ω0)]

**Properties:**
- Linearity; time shift e^{−jωt0} (phase only); frequency shift (multiplication by e^{jω0t}) ↔ X(ω−ω0) — **modulation**.
- Differentiation: d/dt ↔ jω; integration ↔ X/(jω) + πX(0)δ(ω).
- Convolution: x*h ↔ X·H — the LTI frequency-response theorem.
- Parseval: energy in time = energy in frequency.

**LTI frequency response:** H(jω) = F{h(t)}; steady-state output to e^{jω0t} is H(jω0)e^{jω0t} — filter = shaping magnitude and phase per frequency.`,
        extras: [
          table('Signal', ['Transform / series fact'], [
            ['δ(t)', '1 (flat spectrum)'],
            ['e^{−at}u(t)', '1/(a+jω)'],
            ['rect pulse', 'sinc (side lobes decay 1/ω)'],
            ['cos ω0t', 'Two impulses at ±ω0'],
            ['Half-wave symmetric', 'Odd harmonics only'],
          ]),
          tip(
            'Even/odd shortcut',
            'Real + even ⇒ transform real + even; real + odd ⇒ pure imaginary + odd.',
          ),
          warn(
            'sinc definitions differ',
            'sinc(x)=sin(x)/x vs sin(πx)/(πx) — write your definition first in exams.',
          ),
        ],
        worked: {
          title: 'Series of a square wave',
          problem: 'Odd square wave, amplitude 1, period 2π (ω0 = 1). Find the series.',
          steps: [
            { title: 'Symmetry', desc: 'Odd ⇒ only sine terms (aₙ = 0); half-wave symmetric ⇒ odd harmonics only (n = 1, 3, 5...).' },
            { title: 'bₙ integral', desc: 'bₙ = (1/π)∫₀^{2π} x(t) sin(nt) dt over half-period: (4/(nπ)) for odd n, 0 for even.' },
            { title: 'Assemble', desc: 'x(t) = (4/π)[sin(t) + sin(3t)/3 + sin(5t)/5 + ...].' },
            { title: 'Behaviour', desc: 'Amplitudes fall as 1/n — discontinuities need high harmonics (Gibbs phenomenon overshoot ≈ 9% regardless of truncation).' },
            { title: 'Check', desc: 'At t = π/2: sum ≈ 1 − 1/3 + 1/5 ... = π/4 → (4/π)(π/4) = 1 ✓.' },
          ],
          solution: 'x(t) = (4/π) Σ_{n odd} sin(nt)/n — odd harmonics, 1/n decay.',
        },
        practice: {
          title: 'Transform via derivative',
          prompt: 'Find F{e^{−|t|}} by treating it as two-sided decay (or by derivative property).',
          hint: 'Result should be 2/(1+ω²).',
        },
        mistakes: [
          {
            mistake: 'Putting DC and only cosines for an odd function',
            fix: 'Odd ⇒ sine terms only; check symmetry BEFORE computing integrals.',
          },
          {
            mistake: 'Forgetting ω0 = 2π/T0 when writing harmonics',
            fix: 'nω0 = 2πn/T0 — state it explicitly.',
          },
        ],
        exam: {
          question: 'State the convolution property of the Fourier transform and its significance for LTI systems.',
          answer: 'F{x*h} = X(jω)·H(jω): convolution in time = multiplication in frequency — so filtering multiplies each spectral component by H(jω).',
          source: 'Most-frequent property question.',
        },
        summary: [
          'FS for periodic (harmonics at nω0); FT for aperiodic (continuous spectrum).',
          'Symmetry decides which terms appear before any integration.',
          'Convolution ↔ multiplication is why LTI analysis runs in frequency.',
        ],
      }),
      [
        [
          'A real even periodic signal has Fourier series with:',
          ['Sine terms only', 'Cosine terms only (plus DC)', 'Complex exponentials with unequal ± harmonics', 'No DC possible ever'],
          1,
          'Even ⇒ bₙ = 0.',
        ],
          [
          'F{δ(t)} =',
          ['2π δ(ω)', '1', 'u(ω)', 'jω'],
          1,
          'Flat spectrum.',
        ],
        [
          'Multiplying by e^{jω0t} in time corresponds to:',
          ['Scaling amplitude only', 'Frequency shift X(ω − ω0)', 'Time shift', 'Convolution with sinc'],
          1,
          'Modulation property.',
        ],
      ]
    ),
    lesson(
      M2,
      'ss-2-2',
      2,
      'Sampling & Reconstruction',
      'Ideal sampling as multiplication by an impulse train, the spectrum as periodic repetition, Nyquist rate, aliasing and practical reconstruction.',
      13,
      nineBlocks({
        objectives: [
          'Derive the sampled-spectrum (periodic repetition) formula',
          'Compute the Nyquist rate for a signal with given bandwidth',
          'Diagnose aliasing and state conditions for perfect reconstruction',
        ],
        hook:
          'Your phone records voice at 8 kHz — not because voices stop at 4 kHz by law, but because Nyquist said so. And the reconstructed voice is perfect only because of that one theorem. Sampling is where continuous math meets digital everything.',
        concept: `**Ideal sampling:** multiply by impulse train s(t) = Σ δ(t − nTs):
x_s(t) = x(t)·s(t) = Σ x(nTs) δ(t − nTs)

Multiplication in time ⇒ convolution in frequency (with the train's spectrum: impulses at ωs = 2π/Ts, scaled by 1/Ts):
X_s(ω) = (1/Ts) Σ X(ω − nωs) — the baseband spectrum repeated every ωs.

**Nyquist–Shannon theorem:** if the highest frequency in X(ω) is B (bandwidth), the copies do not overlap iff ωs > 2B, i.e. sampling rate **fs > 2B (Nyquist rate = 2B)**. Then an ideal low-pass filter (cutoff between B and fs−B) reconstructs x(t) exactly.

**Aliasing:** fs < 2B ⇒ spectral copies overlap; high frequencies masquerade as low ones — irreversible in post-processing. Symptom: wagon-wheel effect, beat frequencies in audio.

**Practical pipeline:** anti-alias LPF (analog, before ADC) → sample & hold → ADC (quantisation is a separate, lossy step) → digital processing → DAC → reconstruction LPF.

**DT frequency view:** sampling maps analog frequency ω to normalized digital frequency Ω = ωTs ∈ [−π, π]; ωs corresponds to Ω = 2π (one full turn of the DTFT circle) — why DT spectra are periodic with period 2π.

**Undersampling trick (exam depth):** bandpass signals can be sampled below 2B_high if chosen so spectral copies land in disjoint bands — 2× bandwidth can suffice with correct placement.`,
        extras: [
          table('Quantity', ['Symbol / rule'], [
            ['Sampling interval', 'Ts = 1/fs'],
            ['Replication spacing', 'fs (in Hz) / ωs = 2πfs'],
            ['Nyquist rate', 'fs ≥ 2B'],
            ['Reconstruction filter', 'Ideal LPF, gain Ts, cutoff ∈ (B, fs − B)'],
          ]),
          tip(
            'Alias diagnosis',
            'If fs < 2B the copies overlap; increase fs or pre-filter (anti-alias LPF) first.',
          ),
          warn(
            'Nyquist rate vs Nyquist frequency',
            'Nyquist rate = 2B (minimum fs); Nyquist frequency = fs/2 (highest representable). Exams swap these — read carefully.',
          ),
        ],
        worked: {
          title: 'Nyquist rate of a composite signal',
          problem: 'x(t) = cos(100πt) + 0.5 sin(2000πt). Required fs, and what happens at fs = 700 Hz?',
          steps: [
            { title: 'Frequencies', desc: 'cos term: f1 = 50 Hz; sin term: f2 = 1000 Hz. B = max = 1000 Hz.' },
            { title: 'Nyquist rate', desc: 'fs ≥ 2B = 2000 Hz — choose ≥ 2000 samples/s for perfect recovery.' },
            { title: 'At fs = 700', desc: 'The 1000 Hz component aliases to |1000 − 700| = 300 Hz (mod fs folding) — a phantom 300 Hz tone appears.' },
            { title: 'Also', desc: '50 Hz component: 700 > 100 — no alias for it, but the composite still fails.' },
            { title: 'Fix', desc: 'Sample ≥ 2000 Hz, or LPF at 1000 Hz before sampling below 2000.' },
          ],
          solution: 'Nyquist rate 2000 Hz; at 700 Hz the 1 kHz tone folds to 300 Hz (aliasing).',
        },
        practice: {
          title: 'Band-limited check',
          prompt: 'x(t) = sinc²(100t) — estimate B from its transform shape and state the Nyquist rate.',
          hint: 'sinc² ↔ triangle compactly supported in frequency.',
        },
        mistakes: [
          {
            mistake: 'Thinking sampling only matters for audio',
            fix: 'Any ADC (ADC of sensor data, image sensors, control systems) must respect the theorem.',
          },
          {
            mistake: 'Sampling first and filtering later',
            fix: 'Aliased content is already folded — the anti-alias filter must precede sampling.',
          },
        ],
        exam: {
          question: 'State the sampling theorem and the condition for distortionless reconstruction.',
          answer: 'A band-limited signal with maximum frequency B can be perfectly reconstructed from samples taken at fs > 2B, using an ideal low-pass filter of cutoff between B and fs−B.',
          source: 'Evergreen 6-mark question.',
        },
        summary: [
          'Sampling = time multiplication ⇒ spectral replication at fs.',
          'fs > 2B prevents overlap; below it, aliasing folds high frequencies down.',
          'Reconstruction = ideal LPF; anti-alias filtering must happen before ADC.',
        ],
      }),
      [
        [
          'Nyquist rate for B = 8 kHz signal:',
          ['8 kHz', '16 kHz', '4 kHz', '32 kHz'],
          1,
          '2B.',
        ],
        [
          'Aliasing occurs when fs is:',
          ['Greater than 2B', 'Less than 2B', 'Exactly equal to B', 'Zero only'],
          1,
          'Copies overlap below 2B.',
        ],
        [
          'The spectrum of sampled x_s(t) is:',
          ['X(ω) unchanged', 'Periodic copies of X(ω) spaced by ωs', 'X(ω) multiplied by a rect', 'All frequencies removed'],
          1,
          'Replication in frequency.',
        ],
      ]
    ),
  ],
};
