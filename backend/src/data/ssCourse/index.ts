// Signals & Systems — course assembly.
// Phase 4 Bucket B branch core (ECE interview + university exam).
import type { Course, ExamQuestion } from '../db';
import { module1 } from './module1';
import { module2 } from './module2';
import { module3 } from './module3';
import { module4 } from './module4';
import { COURSE_ID } from './helpers';

const examBank: ExamQuestion[] = [
  {
    id: 'ss-ex-1',
    prompt: 'The system y(t) = t·x(t) is:',
    options: [
      'Linear and time-invariant',
      'Linear and causal, but not TI',
      'Nonlinear and noncausal',
      'TI but not linear',
    ],
    correct_index: 1,
    explanation: 't coefficient breaks TI; output tracks present input only (causal); scaling holds (linear).',
    difficulty: 'easy',
    topic: 'System properties',
  },
  {
    id: 'ss-ex-2',
    prompt: 'For an LTI system, BIBO stability is equivalent to:',
    options: [
      'h(t) is absolutely integrable',
      'h(t) is bounded',
      'h(t) has finite energy only',
      'The system is memoryless',
    ],
    correct_index: 0,
    explanation: '∫|h(t)|dt < ∞ (DT: Σ|h[n]| < ∞).',
    difficulty: 'easy',
    topic: 'System properties',
  },
  {
    id: 'ss-ex-3',
    prompt: 'A system with y(t) = x(t+1) is:',
    options: ['Causal', 'Noncausal', 'Unstable only', 'Time-varying only'],
    correct_index: 1,
    explanation: 'Uses a future input value.',
    difficulty: 'easy',
    topic: 'System properties',
  },
  {
    id: 'ss-ex-4',
    prompt: 'Linearity requires that the zero input produces:',
    options: ['Any bounded output', 'Zero output', 'Unit impulse', 'The initial condition'],
    correct_index: 1,
    explanation: 'T{0} = 0 follows from additivity + homogeneity.',
    difficulty: 'easy',
    topic: 'System properties',
  },
  {
    id: 'ss-ex-5',
    prompt: 'The convolution of two finite-duration signals has duration:',
    options: [
      'The longer of the two',
      'The shorter of the two',
      'The sum of both durations',
      'Always infinite',
    ],
    correct_index: 2,
    explanation: 'Widths add in convolution.',
    difficulty: 'easy',
    topic: 'Convolution',
  },
  {
    id: 'ss-ex-6',
    prompt: 'u(t) * u(t) =',
    options: ['u(t)', 't·u(t) (ramp)', 'δ(t)', '2u(t)'],
    correct_index: 1,
    explanation: 'Integral of unit step from 0 to t.',
    difficulty: 'easy',
    topic: 'Convolution',
  },
  {
    id: 'ss-ex-7',
    prompt: 'Convolution with δ(t−t0) results in:',
    options: ['Scaling by t0', 'A time shift of the input by t0', 'Differentiation', 'Zero output'],
    correct_index: 1,
    explanation: 'δ is the identity element; δ(t−t0) shifts.',
    difficulty: 'easy',
    topic: 'Convolution',
  },
  {
    id: 'ss-ex-8',
    prompt: 'The graphical recipe for convolution is:',
    options: [
      'Multiply, then shift, then integrate',
      'Flip, shift, multiply, integrate',
      'Shift, flip, integrate, multiply',
      'Integrate both signals independently',
    ],
    correct_index: 1,
    explanation: 'Flip–shift–multiply–integrate over overlap stages.',
    difficulty: 'medium',
    topic: 'Convolution',
  },
  {
    id: 'ss-ex-9',
    prompt: 'A real even periodic signal has a Fourier series with:',
    options: [
      'Sine terms only',
      'Cosine terms plus DC only',
      'Unequal ±n harmonics',
      'No DC possible',
    ],
    correct_index: 1,
    explanation: 'Even ⇒ bₙ = 0.',
    difficulty: 'easy',
    topic: 'Fourier series',
  },
  {
    id: 'ss-ex-10',
    prompt: 'A half-wave symmetric waveform contains:',
    options: ['All harmonics', 'Only even harmonics', 'Only odd harmonics', 'No harmonics'],
    correct_index: 2,
    explanation: 'x(t ± T/2) = −x(t) kills even harmonics.',
    difficulty: 'medium',
    topic: 'Fourier series',
  },
  {
    id: 'ss-ex-11',
    prompt: 'Fourier transform of δ(t) is:',
    options: ['1', '2π δ(ω)', 'u(ω)', 'jω'],
    correct_index: 0,
    explanation: 'Flat spectrum — every frequency present equally.',
    difficulty: 'easy',
    topic: 'Fourier transform',
  },
  {
    id: 'ss-ex-12',
    prompt: 'Multiplication by e^{jω0t} in time corresponds to:',
    options: [
      'Amplitude scaling only',
      'Frequency shift X(ω−ω0)',
      'Time shift',
      'Convolution with sinc',
    ],
    correct_index: 1,
    explanation: 'Frequency-shift (modulation) property.',
    difficulty: 'easy',
    topic: 'Fourier transform',
  },
  {
    id: 'ss-ex-13',
    prompt: 'Convolution in time corresponds to:',
    options: ['Multiplication in frequency', 'Addition in frequency', 'Differentiation', 'Integration in frequency'],
    correct_index: 0,
    explanation: 'F{x*h} = X·H — the LTI filter theorem.',
    difficulty: 'easy',
    topic: 'Fourier transform',
  },
  {
    id: 'ss-ex-14',
    prompt: 'Parseval\'s theorem states that:',
    options: [
      'Total energy in time equals total energy in frequency',
      'Power doubles in frequency',
      'Phase is preserved under filtering',
      'Sampling preserves phase only',
    ],
    correct_index: 0,
    explanation: 'Energy conservation between domains.',
    difficulty: 'medium',
    topic: 'Fourier transform',
  },
  {
    id: 'ss-ex-15',
    prompt: 'The Nyquist rate for a signal band-limited to B Hz is:',
    options: ['B', '2B', 'B/2', '4B'],
    correct_index: 1,
    explanation: 'fs > 2B prevents spectral overlap.',
    difficulty: 'easy',
    topic: 'Sampling',
  },
  {
    id: 'ss-ex-16',
    prompt: 'Aliasing in sampling occurs when the sampling rate is:',
    options: ['Greater than 2B', 'Less than 2B', 'Exactly B', 'Independent of bandwidth'],
    correct_index: 1,
    explanation: 'Copies overlap; high frequencies fold to low ones.',
    difficulty: 'easy',
    topic: 'Sampling',
  },
  {
    id: 'ss-ex-17',
    prompt: 'The spectrum of an ideally sampled signal is:',
    options: [
      'Identical to the original',
      'Periodic copies of the original spaced by fs',
      'A single impulse at DC',
      'Zero outside the passband',
    ],
    correct_index: 1,
    explanation: 'Time multiplication ⇒ spectral replication.',
    difficulty: 'easy',
    topic: 'Sampling',
  },
  {
    id: 'ss-ex-18',
    prompt: 'Perfect reconstruction from samples requires:',
    options: [
      'A high-pass reconstruction filter',
      'An ideal low-pass filter with cutoff between B and fs−B',
      'No filter at all',
      'Quantisation before filtering',
    ],
    correct_index: 1,
    explanation: 'Isolates the baseband copy; fs must exceed 2B.',
    difficulty: 'medium',
    topic: 'Sampling',
  },
  {
    id: 'ss-ex-19',
    prompt: 'The ROC of the causal transform 1/(s+2) is:',
    options: ['Re(s) < −2', 'Re(s) > −2', '|s| > 2', 'Entire s-plane'],
    correct_index: 1,
    explanation: 'Right of the rightmost pole for right-sided (causal) signals.',
    difficulty: 'easy',
    topic: 'Laplace',
  },
  {
    id: 'ss-ex-20',
    prompt: 'A causal LTI system with H(s) is BIBO stable iff:',
    options: [
      'H(s) has a zero at the origin',
      'All poles of H(s) lie strictly in the open left half-plane',
      'H(jω) = 0 at DC',
      'Denominator degree ≥ numerator degree',
    ],
    correct_index: 1,
    explanation: 'ROC of the causal H(s) then includes the jω axis.',
    difficulty: 'easy',
    topic: 'Laplace',
  },
  {
    id: 'ss-ex-21',
    prompt: 'Laplace transform of e^{−at}u(t) is:',
    options: ['1/(s−a)', '1/(s+a)', 's/(s²+a²)', 'a/(s²+a²)'],
    correct_index: 1,
    explanation: 'ROC: Re(s) > −a.',
    difficulty: 'easy',
    topic: 'Laplace',
  },
  {
    id: 'ss-ex-22',
    prompt: 'A pole on the imaginary axis (simple) for a causal system indicates:',
    options: [
      'Absolute stability',
      'Marginal stability (sustained oscillation)',
      'Exponential growth',
      'Instantaneous response',
    ],
    correct_index: 1,
    explanation: 'Bounded but non-decaying; RHP poles grow.',
    difficulty: 'medium',
    topic: 'Laplace',
  },
  {
    id: 'ss-ex-23',
    prompt: 'Unilateral Laplace of a first derivative x\'(t) is:',
    options: ['X(s)', 'sX(s)', 'sX(s) − x(0⁻)', 'X(s)/s'],
    correct_index: 2,
    explanation: 'Initial-condition term appears; turns ODEs into algebra.',
    difficulty: 'medium',
    topic: 'Laplace',
  },
  {
    id: 'ss-ex-24',
    prompt: 'Z{aⁿ u[n]} =',
    options: [
      'z/(z−a), |z| > |a|',
      'z/(z+a), |z| < |a|',
      '1/(1−az), any z',
      'a/(z−a)',
    ],
    correct_index: 0,
    explanation: 'Right-sided ⇒ ROC outside the circle of radius |a|.',
    difficulty: 'easy',
    topic: 'Z-transform',
  },
  {
    id: 'ss-ex-25',
    prompt: 'A causal DT system with a pole at z = 1.2 is:',
    options: ['Stable', 'Unstable', 'Marginally stable', 'Noncausal'],
    correct_index: 1,
    explanation: 'Pole outside the unit circle.',
    difficulty: 'easy',
    topic: 'Z-transform',
  },
  {
    id: 'ss-ex-26',
    prompt: 'The DTFT equals the z-transform evaluated on:',
    options: ['The real axis', 'The unit circle z = e^{jΩ}', 'The jω axis of s', 'Radius-2 circle'],
    correct_index: 1,
    explanation: 'z = e^{jΩ} is the DTFT slice.',
    difficulty: 'easy',
    topic: 'Z-transform',
  },
  {
    id: 'ss-ex-27',
    prompt: 'A causal DT LTI system is BIBO stable iff all poles of H(z) satisfy:',
    options: [
      '|z| > 1',
      '|z| < 1 (inside the unit circle)',
      'Re(z) < 0',
      'Re(z) > 0',
    ],
    correct_index: 1,
    explanation: 'ROC then includes the unit circle — DT twin of the LHP rule.',
    difficulty: 'easy',
    topic: 'Z-transform',
  },
  {
    id: 'ss-ex-28',
    prompt: 'A single real pole in a Bode plot contributes asymptotically:',
    options: [
      '+20 dB/decade above its corner',
      '−20 dB/decade above its corner',
      '−40 dB/decade everywhere',
      'Flat then +10 dB/decade',
    ],
    correct_index: 1,
    explanation: 'Classic first-order roll-off from the corner frequency.',
    difficulty: 'easy',
    topic: 'Bode & filters',
  },
  {
    id: 'ss-ex-29',
    prompt: 'The −3 dB cutoff frequency corresponds to:',
    options: [
      'Half voltage gain',
      'Half power gain (voltage = 1/√2)',
      'Zero phase shift',
      'Tenfold attenuation',
    ],
    correct_index: 1,
    explanation: 'Power halves; magnitude is 0.707 of passband.',
    difficulty: 'easy',
    topic: 'Bode & filters',
  },
  {
    id: 'ss-ex-30',
    prompt: 'In conventional AM, envelope detection fails when:',
    options: [
      'The carrier frequency is low',
      'Modulation index μ > 1 (overmodulation)',
      'The message is digital',
      'The RC time constant is very small',
    ],
    correct_index: 1,
    explanation: 'Envelope no longer tracks m(t); clips and distorts.',
    difficulty: 'easy',
    topic: 'Modulation',
  },
];

export function getSignalsSystemsCourse(): Course {
  return {
    id: COURSE_ID,
    slug: 'signals-systems',
    title: 'Signals & Systems',
    subtitle:
      'Convolution, Fourier series & transform, sampling theorem, Laplace & Z-transforms, Bode plots and modulation — ECE exam + interview core',
    description: `Signals & Systems is the language every ECE, EE and AI-DS student is expected to speak in university exams, GATE and core interviews. This course covers the full standard syllabus in eight compact lessons: signal classification and the four system properties (linearity, TI, causality, BIBO stability), the convolution integral/sum with the graphical method, Fourier series with symmetry shortcuts, the Fourier transform and its properties, the sampling theorem with Nyquist rate and aliasing, Laplace transforms with ROC-based stability reading, the Z-transform as the discrete twin, Bode plots and filter prototypes, and amplitude modulation as the flagship application of frequency shifting.

Every lesson uses the nine-block structure (objectives, hook, concept, worked example, practice, common mistakes, exam angle, graded quiz, summary). A 30-question bank feeds a 15-question timed final. Passing earns a verifiable TieEdu certificate.

**Who this is for:** ECE/EE/CS students in semester 3–6 preparing for university exams, GATE EC/EE fundamentals, and interviews that ask signals-and-systems questions.

**What you need:** pen and paper for transforms, pole-zero plots and Bode sketches; a calculator for magnitude arithmetic.`,
    category: 'Electronics',
    level: 'intermediate',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    thumbnail_alt: 'Signals and Systems course cover',
    tags: [
      'signals',
      'systems',
      'fourier',
      'laplace',
      'z-transform',
      'sampling',
      'ece',
      'free',
      'interview',
    ],
    outcomes: [
      'Classify signals and test systems for linearity, TI, causality and BIBO stability',
      'Compute convolutions graphically and analytically (CT and DT)',
      'Use Fourier series symmetry rules and compute standard Fourier transform pairs',
      'Apply the sampling theorem: Nyquist rate, aliasing diagnosis and reconstruction',
      'Compute Laplace and Z-transforms with correct ROCs and read stability off poles',
      'Sketch Bode magnitude plots and identify cutoff, Q and filter type',
      'Explain AM as frequency shifting and state the envelope-detection condition',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-10-14T14:00:00.000Z',
    updated_at: '2026-10-14T14:00:00.000Z',
    instructor_id: null,
    about_course: `University Signals & Systems papers reward a fixed method: classify first, test the four properties, choose the transform that kills the hard part, apply the algebraic property, invert, and interpret stability or bandwidth in the original domain. This course drills exactly that method across convolution, Fourier, Laplace and Z, so exam answers follow a checkable sequence instead of guesswork.

The sampling and modulation lessons are written for people who will build real systems: Nyquist is not a mnemonic, it is the reason your phone microphone is digital; AM is not a formula to memorise, it is the frequency-shift property in a trench coat. The Bode lesson closes with the straight-line sketch method interviewers expect you to draw live on a whiteboard.

The final exam draws from a 30-question bank; the certificate project is a small analysis note you can show as proof of skill.`,
    prerequisites: [
      'Basic calculus (integration) and complex numbers',
      'Comfort with exponentials and trigonometry',
    ],
    audience: [
      'ECE/EE students in semester 3–5 facing university Signals & Systems exams',
      'GATE EC/EE aspirants building transform fundamentals',
      'Placement candidates preparing for core ECE interview rounds',
      'CS/AI students who want signal processing foundations for audio/ML',
    ],
    audio_language: 'English',
    caption_language: 'English',
    branch: 'ece',
    branch_label: 'ECE / EE core (also useful for AI-DS signal processing)',
    bucket: 'B',
    certificate_tier: 'professional',
    estimated_hours: 8,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    exam_prep: {
      target: 'University mid-terms and finals; GATE EC/EE core; placement ECE rounds',
      units: [
        {
          title: 'Signals, Systems & Convolution',
          summary:
            'CT/DT, energy/power, periodicity (rational ratio for sums), even/odd. Four tests: linearity (weighted sums), TI (delay input ⇒ delayed output), causality (no future input), BIBO (∫|h| < ∞ for LTI). LTI ⇒ convolution; graphical flip–shift–multiply–integrate; commutative, widths add, δ identity; rect*rect = triangle.',
          questions: [
            'Test y(t) = t·x(t) for all four properties.',
            'State BIBO stability in terms of h(t).',
            'Compute u(t)*u(t) by stages.',
            'Why does convolution require LTI?',
          ],
          pyqs: [],
        },
        {
          title: 'Fourier Series, Transform & Sampling',
          summary:
            'Trig/exponential FS with symmetry shortcuts (even ⇒ cosine, odd ⇒ sine, half-wave ⇒ odd harmonics). FT pairs: δ↔1, e^{−at}u ↔ 1/(a+jω), rect ↔ sinc, cos ↔ impulses. Properties: time shift (phase), frequency shift (modulation), convolution ↔ multiplication, Parseval. Sampling: x_s spectrum = copies spaced fs; Nyquist fs > 2B; anti-alias LPF before ADC; reconstruction LPF.',
          questions: [
            'FS of an odd half-wave symmetric square wave.',
            'State the convolution property and its LTI significance.',
            'Nyquist rate of a two-tone composite signal.',
            'Why must anti-alias filtering precede sampling?',
          ],
          pyqs: [],
        },
        {
          title: 'Laplace & Z-Transforms',
          summary:
            'Bilateral Laplace with ROC strip; causal ⇒ right of rightmost pole; stable ⇔ ROC includes jω ⇔ all poles LHP. Unilateral derivative rule turns ODEs into algebra. H(s) = Y/X; poles = natural modes. Z-transform: unit circle = DTFT slice; pairs for u[n], aⁿu[n]; causal stable ⇔ all poles inside |z| < 1; difference equations via z-algebra.',
          questions: [
            'State the causal LTI stability condition on H(s) poles.',
            'Find ROC of 1/(s+2) for causal vs anticausal.',
            'Solve y[n] − 0.5y[n−1] = u[n] via z-transform.',
            'DT stability rule for poles of H(z).',
          ],
          pyqs: [],
        },
        {
          title: 'Bode Plots & Modulation',
          summary:
            'Bode: log-ω axis, dB magnitude, straight-line rules (±20 dB/dec per pole/zero, −40 for 2nd-order), −3 dB at corner. Second-order ζ/Q: resonance if ζ < 0.707. Filters: LPF/HPF/BPF/notch; Butterworth flat, Chebyshev steep. AM: m(t)cos(ωc t) ⇒ copies at ±ωc; conventional AM with μ ≤ 1 for envelope detection; DSB-SC coherent; SSB half-bandwidth.',
          questions: [
            'Sketch Bode mag of 100/(s+10): DC gain, corner, slope.',
            'Envelope-detection condition with modulation index.',
            'Bandwidth comparison: AM vs DSB-SC vs SSB for same Wm.',
            'Map a real product (EQ, radio, PID) onto the transform toolkit.',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Four system properties with standard test procedures and counterexample signals.',
        'Convolution integral graphical method with all overlap stages labelled.',
        'Fourier series with symmetry analysis before integration.',
        'Sampling theorem statement, Nyquist rate and reconstruction filter conditions.',
        'Laplace ROC rules mapping to causality and BIBO stability.',
        'Z-transform difference-equation solving with partial fractions.',
        'Bode straight-line sketch from a pole/zero description.',
        'AM as frequency-shift property with envelope-detection condition.',
      ],
      previous_year_questions: [
        {
          year: '2024',
          question:
            'A continuous-time LTI system has impulse response h(t) = e^{−2t}u(t). Is the system causal and stable? Justify using the ROC of H(s).',
          solution:
            'h(t) = 0 for t < 0 ⇒ causal. H(s) = 1/(s+2) with ROC Re(s) > −2, which includes the jω axis (σ = 0) and has its only pole at s = −2 (LHP) ⇒ BIBO stable. ∫|h| dt = 1/2 < ∞ confirms independently.',
        },
        {
          year: '2023',
          question:
            'State the sampling theorem. A signal x(t) = 2cos(100πt) + sin(2000πt) is sampled at 700 Hz. Identify any aliased components and state the minimum correct sampling rate.',
          solution:
            'Theorem: band-limited B ⇒ perfect reconstruction from fs > 2B via ideal LPF. Components: 50 Hz and 1000 Hz; B = 1000 Hz ⇒ Nyquist rate 2000 Hz. At fs = 700 Hz the 1000 Hz tone folds to |1000 − 700| = 300 Hz (alias); the 50 Hz component does not alias (700 > 100) but the composite is corrupted. Fix: fs ≥ 2000 Hz or pre-LPF at 1000 Hz then sample ≥ 2000.',
        },
        {
          year: '2025',
          question:
            'Explain how amplitude modulation illustrates the Fourier frequency-shift property. What condition must hold for envelope detection of conventional AM, and why?',
          solution:
            'Multiplication by cos(ωc t) shifts M(ω) to ±ωc scaled by ½ — the frequency-shift property. Envelope detection (diode + LPF) recovers the message only when modulation index μ = max|m(t)|/A ≤ 1, so the envelope A + m(t) never becomes negative; otherwise overmodulation clips the envelope and distorts the recovered audio.',
        },
      ],
    },
    project: {
      title: 'Signals analysis notebook',
      brief:
        'Pick one real signal (voice clip, sensor CSV, or generated square wave + channel model) and analyse it end-to-end in a markdown/PDF notebook (or Jupyter export): (1) classify it (energy/power, periodicity, bandwidth estimate); (2) compute or sketch its spectrum (Fourier series or transform) with symmetry notes; (3) if sampling, state the Nyquist rate, choose fs, and show one aliased vs non-aliased scenario; (4) design a simple first- or second-order filter (write H(s), mark cutoff on a Bode sketch) and state what it removes; (5) if using modulation, draw the before/after spectrum. Include any code or hand calculations as an appendix.',
      submission_hint:
        'PDF, public markdown, or a GitHub link with the notebook — plots can be from Python/MATLAB or hand-sketched and photographed; the reasoning text matters more than production polish.',
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
