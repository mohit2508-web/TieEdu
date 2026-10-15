// Module 3 — Laplace & Z-Transforms
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Laplace & Z-Transforms',
  summary:
    'Bilateral/unilateral Laplace with ROC, pole-zero plots and stability reading, transfer functions, then the Z-transform as the DT twin.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'ss-3-1',
      1,
      'Laplace Transform, ROC & Transfer Functions',
      'Region of convergence as the "where does the sum converge" answer, pole-zero reading of stability/causality, and H(s) for LTI systems.',
      13,
      nineBlocks({
        objectives: [
          'Compute unilateral Laplace transforms of standard signals with their ROCs',
          'Read causality and stability off the ROC / pole locations',
          'Form H(s) = Y(s)/X(s) and identify poles as natural-response frequencies',
        ],
        hook:
          'The Fourier transform fails on signals that blow up (e^{3t}u(t) has no FT). Laplace adds a convergence exponent σ to tame them — and the ROC it forces on you turns out to encode causality and stability. The "extra" variable carries the answers.',
        concept: `**Bilateral Laplace:** X(s) = ∫_{−∞}^{∞} x(t)e^{−st}dt, s = σ + jω.
Along the imaginary axis (σ=0) it reduces to the Fourier transform — FT is a slice of Laplace.

**Why ROC exists:** the integral may converge only for a strip of σ values — the Region Of Convergence. Poles (where X(s) = ∞) bound the ROC; the ROC never contains a pole.

**Pairs (unilateral, t≥0):**
- u(t) ↔ 1/s, Re(s) > 0
- e^{−at}u(t) ↔ 1/(s+a), Re(s) > −a
- cos(ω0t)u(t) ↔ s/(s²+ω0²)
- t^n e^{−at}u(t) ↔ n!/(s+a)^{n+1}
- δ(t) ↔ 1
- derivative: x′(t) ↔ sX(s) − x(0⁻) (unilateral — turns ODEs into algebra)

**ROC rules → system reading:**
- Right-sided signal ⇒ ROC = right of rightmost pole ⇒ causal system.
- Left-sided ⇒ ROC left of leftmost pole ⇒ anticausal.
- Two-sided ⇒ strip between poles.
- **Stability of causal LTI ⇔ ROC includes the jω axis ⇔ all poles in the LEFT half-plane (Re(s) < 0).**
- Marginally stable: poles ON jω axis (e^{jω0t} persists); unstable: any RHP pole.

**Transfer function:** H(s) = L{h(t)} = Y(s)/X(s) with zero initial conditions.
- Poles = natural (transient) modes e^{pᵢt}; zeros shape amplitude/phase.
- Region of convergence of H(s) = ROC of h(t) — same causal/stable reading.
- Frequency response = H(jω) — evaluate H(s) on the jω axis where the ROC includes it.

**Pole placement:** LHP ⇒ decaying exponentials (stable); RHP ⇒ growing (unstable); jω ⇒ sustained oscillation. Multi-pole repeated roots ⇒ t·e^{at} envelopes.`,
        extras: [
          table('Signal x(t), t ≥ 0', ['X(s)', 'ROC'], [
            ['u(t)', '1/s', 'Re(s) > 0'],
            ['e^{−at}u(t)', '1/(s+a)', 'Re(s) > −a'],
            ['cos ω0t u(t)', 's/(s²+ω0²)', 'Re(s) > 0'],
            ['t e^{−at}u(t)', '1/(s+a)²', 'Re(s) > −a'],
            ['δ(t)', '1', 'Entire s-plane'],
          ]),
          tip(
            'ROC one-liner',
            'Causal ⇒ right of rightmost pole; stable ⇒ ROC touches jω; for causal systems, both ⇔ all poles LHP.',
          ),
          warn(
            'Two signals can share X(s)',
            'Same algebra, different ROC ⇒ different x(t) — always state the ROC with the transform.',
          ),
        ],
        worked: {
          title: 'System stability from H(s)',
          problem: 'H(s) = 10/((s+2)(s−3)), system causal. Stable? What if instead poles were at −2, −4?',
          steps: [
            { title: 'Causal ROC', desc: 'Causal ⇒ ROC is right of the rightmost pole: Re(s) > 3.' },
            { title: 'jω axis?', desc: 'ROC Re(s) > 3 does NOT include the jω axis (σ=0 is outside) ⇒ not BIBO stable.' },
            { title: 'Physical read', desc: 'Pole at s = +3 ⇒ h(t) contains e^{3t} — grows unbounded.' },
            { title: 'Alternative', desc: 'Poles at −2 and −4: ROC Re(s) > −4 includes jω ⇒ stable; h(t) = sum of decaying e^{−2t}, e^{−4t}.' },
            { title: 'Checklist', desc: 'For causal: all poles strictly LHP ⇔ stable.' },
          ],
          solution: 'Pole at +3 ⇒ unstable; all-LHP poles ⇒ stable with same reasoning template.',
        },
        practice: {
          title: 'Laplace of an ODE term',
          prompt: 'Take the unilateral Laplace of y″(t) + 3y′(t) + 2y(t) with zero initial conditions.',
          hint: 'Each derivative multiplies by s.',
        },
        mistakes: [
          {
            mistake: 'Quoting a transform without its ROC',
            fix: 'ROC selects between causal/anticausal/time-shifted possibilities with identical algebra.',
          },
          {
            mistake: 'Calling any pole on the jω axis unstable immediately',
            fix: 'jω-axis simple poles = marginally stable (bounded, non-decaying); RHP poles = unstable.',
          },
        ],
        exam: {
          question: 'Give the condition on H(s) for a causal LTI system to be BIBO stable.',
          answer: 'All poles of H(s) must lie strictly in the left half of the s-plane (Re(s) < 0) — equivalently the ROC of the causal H(s) includes the jω axis.',
          source: 'Classic stability question.',
        },
        summary: [
          'Laplace adds σ for convergence; ROC bounds convergence and encodes causality/stability.',
          'Poles = natural modes; LHP stable, RHP unstable, jω marginal (causal case).',
          'H(s) = Y/X with zero initial conditions; H(jω) is the frequency response.',
        ],
      }),
      [
        [
          'ROC of the causal transform 1/(s+2) is:',
          ['Re(s) < −2', 'Re(s) > −2', '|s| > 2', 'Entire plane'],
          1,
          'Right of the pole for right-sided (causal).',
        ],
        [
          'A causal LTI system is BIBO stable iff:',
          ['H(s) has a zero at origin', 'All poles of H(s) are in the open LHP', 'H(jω) = 0 at DC', 'Degree of denominator ≥ numerator'],
          1,
          'ROC then includes jω.',
        ],
        [
          'L{e^{−at}u(t)} =',
          ['1/(s − a)', '1/(s + a)', 's/(s²+a²)', 'a/(s²+a²)'],
          1,
          'ROC Re(s) > −a.',
        ],
      ]
    ),
    lesson(
      M3,
      'ss-3-2',
      2,
      'Z-Transform: The DT Twin',
      'Z-transform definition, ROC as annuli, inverse and difference-equation solving, poles/zeros on the z-plane reading stability for causal DT systems.',
      13,
      nineBlocks({
        objectives: [
          'Compute z-transforms of standard DT signals with correct ROCs',
          'Solve a linear constant-coefficient difference equation via z-transforms',
          'Read DT stability/causality from pole locations relative to the unit circle',
        ],
        hook:
          'Every digital filter you will ever write — in a phone, a car, a radio — is a difference equation, and the z-transform is how engineers prove it will behave. If Laplace is the analog toolkit, z is the same toolkit rotated into discrete time.',
        concept: `**Definition (one-sided, common in courses):** X(z) = Σ_{n≥0} x[n] z^{−n}, z ∈ ℂ.
Related to DTFT by z = e^{jΩ} — the unit circle is the DTFT slice, just as the jω axis is the FT slice of Laplace.

**Pairs (causal, n ≥ 0):**
- δ[n] ↔ 1
- u[n] ↔ z/(z−1) = 1/(1−z^{−1}), |z| > 1
- a^n u[n] ↔ z/(z−a) = 1/(1−az^{−1}), |z| > |a|
- n a^n u[n] ↔ az/(z−a)², |z| > |a|
- cos(Ω0 n)u[n] ↔ z(z−cos Ω0)/(z²−2z cos Ω0 + 1), |z| > 1

**Properties:** linearity; time shift z^{−1} (with initial-condition terms unilaterally); multiplication by a^n ↔ X(z/a) (DT analog of s-shift); convolution ⇒ multiplication (Y = H·X) — the filter theorem.

**ROC as annulus/circle regions:** right-sided ⇒ outside circle |z| > R; left-sided ⇒ inside; two-sided ⇒ ring R1 < |z| < R2. ROC never contains a pole.

**Stability reading (causal DT LTI):** stable ⇔ ROC includes the unit circle ⇔ **all poles inside the unit circle |z| < 1**. Outside ⇒ unstable; on the circle ⇒ marginally stable (persistent oscillation/DC).

**Difference equations:** take z-transform of both sides term-by-term (shifts become powers of z with zero ICs), solve H(z) = Y/X, then invert via partial fractions + tables. Coefficients of the DE appear directly in the denominator — feedback poles live there.

**System function:** H(z) = Z{h[n]}; poles = natural modes pᵢ^n; frequency response = H(e^{jΩ}) = H(z)|_{z=e^{jΩ}}.`,
        extras: [
          table('x[n], n ≥ 0', ['X(z)', 'ROC'], [
            ['u[n]', 'z/(z−1)', '|z| > 1'],
            ['a^n u[n]', 'z/(z−a)', '|z| > |a|'],
            ['n a^n u[n]', 'az/(z−a)²', '|z| > |a|'],
            ['δ[n]', '1', 'All z'],
          ]),
          tip(
            'Unit circle ⇔ stability',
            'Causal DT system stable ⇔ every pole strictly INSIDE |z| = 1 — mirror image of the LHP rule.',
          ),
          warn(
            'z vs s pole rules are different shapes',
            'Laplace: LHP (half-plane). Z: inside unit circle (disk). Do not mix them.',
          ),
        ],
        worked: {
          title: 'Solve a difference equation',
          problem: 'y[n] − 0.5y[n−1] = x[n], causal, zero initial state, x[n] = u[n]. Find y[n].',
          steps: [
            { title: 'Transform', desc: 'Y(z) − 0.5z^{−1}Y(z) = X(z) ⇒ H(z) = 1/(1 − 0.5z^{−1}) = z/(z − 0.5).' },
            { title: 'Input', desc: 'X(z) = z/(z−1) (step).' },
            { title: 'Multiply', desc: 'Y(z) = z/((z−0.5)(z−1)) — partial fractions in z^{−1} form: Y(z)/(z) style expansion gives 2·z/(z−1) − z/(z−0.5) ... (standard PFE).' },
            { title: 'Inverse', desc: 'y[n] = [2 − (0.5)^n] u[n].' },
            { title: 'Sanity', desc: 'y[0] = 2−1 = 1 = x[0] ✓; pole 0.5 inside unit circle ⇒ stable, transient dies out leaving DC gain 2.' },
          ],
          solution: 'y[n] = (2 − 0.5ⁿ)u[n]; pole at 0.5 ⇒ stable causal response.',
        },
        practice: {
          title: 'Pole test',
          prompt: 'H(z) = z/(z − 1.1), causal. Stable? What does the impulse response look like?',
          hint: '|z| = 1.1 > 1.',
        },
        mistakes: [
          {
            mistake: 'Applying the LHP stability rule to z',
            fix: 'DT causal stability = poles inside the UNIT CIRCLE, not left half-plane.',
          },
          {
            mistake: 'Ignoring the ROC when inverting to a^n u[n] vs −a^n u[−n−1]',
            fix: 'Same X(z), different ROC ⇒ causal vs anticausal — always state ROC.',
          },
        ],
        exam: {
          question: 'State the stability condition for a causal discrete-time LTI system in terms of H(z) poles.',
          answer: 'The system is BIBO stable iff all poles of H(z) lie strictly inside the unit circle (|z| < 1) — equivalently the ROC includes |z| = 1.',
          source: 'Standard DT stability question.',
        },
        summary: [
          'Z-transform = DT Laplace; unit circle plays the role of the jω axis.',
          'Causal stable ⇔ all poles inside |z| < 1.',
          'Difference equations become algebra in z; H(z) = Y/X with zero initial state.',
        ],
      }),
      [
        [
          'Z{a^n u[n]} =',
          ['z/(z − a), |z| > |a|', 'z/(z + a), |z| < |a|', '1/(1 − az), any z', 'a/(z − a)'],
          0,
          'Right-sided ⇒ outside circle.',
        ],
        [
          'A causal DT system with a pole at z = 1.2 is:',
          ['Stable', 'Unstable', 'Marginally stable', 'Noncausal'],
          1,
          'Pole outside the unit circle.',
        ],
        [
          'The DTFT is the z-transform evaluated on:',
          ['Real axis', 'Unit circle z = e^{jΩ}', 'jω axis of s', 'Radius-2 circle'],
          1,
          'z = e^{jΩ} slice.',
        ],
      ]
    ),
  ],
};
