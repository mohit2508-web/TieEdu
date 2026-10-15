// Module 4 — Dimensional Analysis & Open Channel Flow
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Dimensional Analysis & Open Channel Flow',
  summary:
    'Buckingham Pi theorem, model scaling laws, specific energy, Froude-number regimes, and hydraulic jumps in open channels.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'fm-4-1',
      1,
      'Dimensional Analysis & Similitude',
      'Rayleigh/Buckingham Pi methods, common dimensionless groups in fluid mechanics, and the three similitude conditions (geometric, kinematic, dynamic).',
      13,
      nineBlocks({
        objectives: [
          'Derive dimensionless Pi groups via the Buckingham Pi theorem',
          'Identify and interpret Re, Fr, We, Ma and Ca in appropriate problems',
          'State geometric, kinematic and dynamic similarity requirements for model tests',
        ],
        hook:
          'A 1:50 scale model of a ship in a towing tank predicts the full-size vessel\'s resistance only because both share the same Reynolds and Froude numbers — which is often impossible to satisfy simultaneously. Model testing is the art of choosing which dimensionless group dominates, and that choice starts with dimensional analysis.',
        concept: `**Base dimensions in mechanics:** M (mass), L (length), T (time) — three independent dimensions (force F is MLT⁻², not a fourth base in MLT systems).

**Rayleigh method:** assume the dependent variable is a product of powers of the influencing variables; equate exponents of M, L, T and solve.

**Buckingham Pi theorem:** n variables with k independent dimensions → (n − k) dimensionless Pi groups. Steps: pick k repeating variables covering all dimensions (but not the dependent variable); combine each remaining variable with the repeating set; solve exponent systems so each Pi is dimensionless.

**Key dimensionless groups:**
- Reynolds Re = ρVL/μ = VL/ν — inertia/viscous (dominates pipe/boundary-layer/airfoil drag at high speed).
- Froude Fr = V/√(gL) — inertia/gravity (dominates free-surface flows, ship waves, open channels).
- Weber We = ρV²L/σ — inertia/surface tension (droplets, capillary, spray).
- Mach Ma = V/c — compressibility (gas dynamics).
- Euler Eu = Δp/(ρV²) — pressure/inertia (fully submerged, no free surface).
- Cauchy/elastic — inertia/elasticity (water hammer, structural-fluid coupling).

**Similitude (model → prototype):**
- Geometric: all lengths scale by the same ratio L_r.
- Kinematic: velocity/time ratios consistent with the length scale and chosen time scale.
- Dynamic: all relevant force (dimensionless group) ratios equal — Re equality for viscous-dominated flow, Fr equality for free-surface flow, both (impossible without a second fluid) for ships — hence wave-makers or CFD corrections.

**Model laws:** if Re-dominated, match Re (viscous similitude); if Fr-dominated, match Fr (gravity similitude); if both matter (ship resistance), split the force budget (frictional by Re-correction, wave-making by Fr).`,
        extras: [
          table('Group', ['Definition', 'Dominant physics'], [
            ['Reynolds Re', 'VL/ν', 'Viscous vs inertia'],
            ['Froude Fr', 'V/√(gL)', 'Free-surface / gravity'],
            ['Weber We', 'ρV²L/σ', 'Surface tension'],
            ['Mach Ma', 'V/c', 'Compressibility'],
            ['Euler Eu', 'Δp/(ρV²)', 'Pressure (submerged)'],
          ]),
          tip(
            'Repeating-variable checklist',
            'Choose variables that between them contain M, L and T exactly (e.g. ρ, V, L), and never pick the dependent variable itself.',
          ),
          warn(
            'Cannot match Re and Fr simultaneously with water at geometric scale',
            'Ship-model law: match Fr for wave pattern; correct friction via ITTC-style Re extrapolation — do not claim true dynamic similarity.',
          ),
        ],
        worked: {
          title: 'Buckingham Pi on drag force',
          problem: 'Drag F on a submerged body depends on ρ, V, L, μ. Find the Pi relation.',
          steps: [
            { title: 'Count', desc: 'n = 5 variables (F, ρ, V, L, μ); k = 3 dimensions (M, L, T) ⇒ 2 Pi groups.' },
            { title: 'Repeating set', desc: 'Choose ρ, V, L — they span M, L, T.' },
            { title: 'First Pi (with F)', desc: 'Π₁ = F/(ρV²L²) — the drag coefficient C_D.' },
            { title: 'Second Pi (with μ)', desc: 'Π₂ = μ/(ρVL) = 1/Re.' },
            { title: 'Result', desc: 'C_D = φ(Re) — drag coefficient is a function of Reynolds number only (for incompressible, fully submerged flow) — the classic experimental drag-curve form.' },
          ],
          solution: 'C_D = F/(½ρV²A) (or ρV²L² form) = function of Re — dimensional analysis predicts the structure of every drag experiment.',
        },
        practice: {
          title: 'Open-channel Pi',
          prompt: 'Wave speed c in shallow water depends on g and depth h only. Derive the dimensionless group (should reduce to c/√(gh) = constant).',
          hint: 'n = 3, k = 2 (L, T) ⇒ one Pi.',
        },
        mistakes: [
          {
            mistake: 'Including force F as a base dimension alongside M, L, T in MLT systems',
            fix: 'Force is derived (MLT⁻²); using both F and M as bases creates dependency and breaks the Pi count.',
          },
          {
            mistake: 'Applying Re-similitude to a spillway model',
            fix: 'Free-surface gravity flows are Fr-dominated — match Froude number, not Reynolds.',
          },
        ],
        exam: {
          question: 'State the Buckingham Pi theorem and apply it to show drag on a submerged body is C_D = f(Re).',
          answer: 'n variables with k independent dimensions yield (n − k) dimensionless groups. For F = f(ρ, V, L, μ): 5 − 3 = 2 groups; C_D = F/(ρV²L²) and Re = ρVL/μ; hence C_D = φ(Re).',
          source: 'Standard dimensional-analysis derivation.',
        },
        summary: [
          'Buckingham Pi: (n − k) dimensionless groups from M, L, T analysis.',
          'Re (viscous), Fr (free surface), We (surface tension), Ma (compressibility).',
          'Similitude: geometric + kinematic + dynamic; ships match Fr, correct Re.',
        ],
      }),
      [
        [
          'The number of independent dimensionless Pi groups from n variables with k base dimensions is:',
          ['n + k', 'n − k', 'n × k', 'k − n'],
          1,
          'Buckingham Pi theorem.',
        ],
        [
          'Open-channel free-surface flow similitude primarily matches:',
          ['Reynolds number', 'Froude number', 'Mach number', 'Weber number'],
          1,
          'Gravity dominates over viscosity for wave patterns.',
        ],
        [
          'Drag on a fully submerged incompressible body is best correlated as:',
          ['C_D = f(Re)', 'C_D = f(Fr)', 'C_D = f(Ma)', 'C_D constant always'],
          0,
          'Dimensional analysis result for submerged flow.',
        ],
      ]
    ),
    lesson(
      M4,
      'fm-4-2',
      2,
      'Open Channel Flow: Specific Energy & Hydraulic Jumps',
      'Critical depth, subcritical/supercritical regimes, specific-energy diagrams, and the hydraulic-jump momentum relation.',
      13,
      nineBlocks({
        objectives: [
          'Compute critical depth and classify flow as subcritical or supercritical via Froude number',
          'Use the specific-energy diagram to analyze channel transitions (steps, sluices)',
          'Apply continuity + momentum to size a hydraulic jump and its energy loss',
        ],
        hook:
          'Below every big dam spillway there is a violent whitewater roller — a hydraulic jump — deliberately engineered to dissipate energy before it erodes the riverbed. The jump is not a bug; it is a momentum-balance machine that civil engineers design on purpose, and its size is fixed by two equations you already know.',
        concept: `**Open channel basics:** flow driven by gravity along a slope; the free surface adjusts so pressure is hydrostatic across any vertical (normal to the bed for mild slopes).

**Froude number (open channel):** Fr = V/√(gD), where D = hydraulic depth = A/T (flow area / top width); for a wide rectangular channel D ≈ depth y.
- Fr < 1 subcritical (deep, slow — disturbances travel upstream).
- Fr = 1 critical.
- Fr > 1 supercritical (shallow, fast — disturbances cannot travel upstream).

**Specific energy:** E = y + V²/(2g) (energy per unit weight above the channel bottom).
- For a given rectangular-channel discharge per width q: E = y + q²/(2gy²).
- Minimum E at critical depth y_c = (q²/g)^{1/3}; at critical flow V = √(gD) (wide channel: V = √(gy_c)).
- Two alternate depths share the same E (one sub, one super) except at E_min.

**Channel transitions:**
- Smooth step up (h): E₂ = E₁ − h; may choke if the step is too high.
- Sluice gate / sluice: forces supercritical under the gate from a subcritical reservoir; use specific energy + continuity (and sometimes momentum if there is a jump).

**Hydraulic jump:** abrupt transition from supercritical to subcritical with large turbulence and energy loss (but momentum conserved horizontally if bed friction neglected).
- For a rectangular channel: y₂/y₁ = ½(√(1 + 8Fr₁²) − 1) — the classic conjugate-depth relation.
- Energy loss: ΔE = (y₂ − y₁)³/(4 y₁ y₂).
- Froude at the upstream side must be > 1; the jump length is a few times the jump height (empirical ~5–7 y₂ for design).

**Where jumps appear:** spillway bases (energy dissipators), abrupt changes in slope, sluice-gate exits.`,
        extras: [
          table('Quantity', ['Formula / rule'], [
            ['Froude (wide channel)', 'Fr = V/√(gy)'],
            ['Specific energy', 'E = y + V²/(2g)'],
            ['Critical depth (rect, per width)', 'y_c = (q²/g)^{1/3}'],
            ['Critical velocity', 'V_c = √(gy_c)'],
            ['Conjugate depths', 'y₂/y₁ = ½(√(1 + 8Fr₁²) − 1)'],
            ['Jump energy loss', 'ΔE = (y₂ − y₁)³/(4 y₁ y₂)'],
          ]),
          tip(
            'Fr before touching E diagrams',
            'One line of Fr classification prevents half the specific-energy sign errors — always compute Fr first.',
          ),
          warn(
            'Hydraulic jumps lose energy but conserve horizontal momentum (neglecting friction)',
            'Do not try to use the energy equation across the jump — it is highly dissipative; use momentum + continuity for conjugate depths.',
          ),
        ],
        worked: {
          title: 'Hydraulic jump sizing',
          problem: 'Rectangular channel, y₁ = 0.3 m, V₁ = 6 m/s. Find y₂, Fr₁, and energy loss. g = 9.81.',
          steps: [
            { title: 'Froude upstream', desc: 'Fr₁ = V₁/√(gy₁) = 6/√(9.81×0.3) = 6/√2.943 ≈ 6/1.716 ≈ 3.50 — supercritical, a jump can form.' },
            { title: 'Conjugate depth', desc: 'y₂/y₁ = ½(√(1 + 8×3.50²) − 1) = ½(√(1 + 98) − 1) = ½(10 − 1) = 4.5 ⇒ y₂ ≈ 1.35 m.' },
            { title: 'Velocity downstream', desc: 'Continuity (wide channel, same width): V₂ = V₁ y₁/y₂ = 6 × 0.3/1.35 ≈ 1.33 m/s.' },
            { title: 'Fr check downstream', desc: 'Fr₂ ≈ 1.33/√(9.81×1.35) ≈ 1.33/3.64 ≈ 0.37 < 1 ✓ (subcritical after the jump).' },
            { title: 'Energy loss', desc: 'ΔE = (y₂ − y₁)³/(4 y₁ y₂) = (1.05)³/(4×0.3×1.35) ≈ 1.158/1.62 ≈ 0.715 m — substantial dissipation.' },
          ],
          solution: 'Fr₁ ≈ 3.5; y₂ ≈ 1.35 m; ΔE ≈ 0.72 m dissipated in the jump.',
        },
        practice: {
          title: 'Choking on a step',
          prompt: 'Flow approaches critical over a raised bed step. If the step is raised further, what happens to the upstream depth? Explain with the E-diagram.',
          hint: 'E available above the step shrinks; upstream must back up to raise E₁.',
        },
        mistakes: [
          {
            mistake: 'Using Bernoulli (energy) across a hydraulic jump',
            fix: 'The jump is dissipative — energy is NOT conserved; use momentum (conjugate-depth relation) + continuity.',
          },
          {
            mistake: 'Forgetting to use hydraulic depth A/T for non-rectangular sections in Fr',
            fix: 'Fr = V/√(gD) with D = A/T; the √(gy) shortcut is wide-rectangle only.',
          },
        ],
        exam: {
          question: 'Define critical flow in an open channel and derive the conjugate-depth relation for a hydraulic jump in a rectangular channel.',
          answer: 'Critical flow: Fr = 1, specific energy minimum for the given discharge; y_c = (q²/g)^{1/3} for a wide rectangular channel. Jump: apply continuity (V₁y₁ = V₂y₂) and horizontal momentum balance (pressure + momentum flux equal across the jump, friction neglected) to obtain y₂/y₁ = ½(√(1 + 8Fr₁²) − 1).',
          source: 'Standard open-channel derivation.',
        },
        summary: [
          'Fr = V/√(gD) classifies subcritical (Fr < 1) vs supercritical (Fr > 1).',
          'E = y + V²/(2g); minimum at critical depth; two alternate depths per E > E_min.',
          'Hydraulic jump: conjugate depths via Fr₁; large ΔE = (y₂−y₁)³/(4y₁y₂) — engineered energy dissipation.',
        ],
      }),
      [
        [
          'Critical flow in a wide rectangular channel occurs when:',
          ['Fr = 0', 'Fr = 1', 'Fr > 1 always', 'V = 0'],
          1,
          'Minimum specific energy for the discharge.',
        ],
        [
          'A hydraulic jump transforms flow from:',
          ['Subcritical to supercritical', 'Supercritical to subcritical', 'Laminar to turbulent only', 'Critical to stagnant'],
          1,
          'Abrupt deceleration with energy loss.',
        ],
        [
          'Specific energy E in an open channel is defined as:',
          ['Total head above datum', 'Energy per unit weight above the channel bottom: y + V²/(2g)', 'Pressure head only', 'Velocity head only'],
          1,
          'E = y + V²/(2g).',
        ],
      ]
    ),
  ],
};
