// Module 3 — Momentum & Pipe Flow
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Momentum & Pipe Flow',
  summary:
    'The linear momentum equation for control volumes, force of jets on plates and vanes, Darcy–Weisbach losses, and pipe-flow problem solving.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'fm-3-1',
      1,
      'Momentum Equation & Jet Forces',
      'Reynolds transport theorem intuition, applying ΣF = ṁ(V_out − V_in) to jets hitting plates/vanes, and reaction forces on pipe bends.',
      13,
      nineBlocks({
        objectives: [
          'Apply the linear momentum equation to a steady control volume with one inlet/outlet',
          'Compute jet impact force on stationary flat plates, inclined plates and moving vanes',
          'Find anchoring/reaction forces on pipe bends and nozzles',
        ],
        hook:
          'Pelton-wheel turbines and fire-hose recoil are the same equation with opposite signs: the fluid\'s change of momentum is the force the structure must supply. Momentum is how fluids push things — and every rotating machine in a power plant is a momentum-transfer device.',
        concept: `**Linear momentum equation (steady, CV):**
ΣF_ext = ṁ(V_out − V_in)
- ΣF includes pressure forces on the control surface, gravity on the fluid, and reaction forces from solid boundaries (what you solve for).
- Vectors matter: resolve into components; the force of the jet on the plate is opposite to the force of the plate on the fluid (Newton III).

**Jet on a stationary flat plate (normal impact):**
- Assume jet fully deflects parallel to the plate (or stops): V_out along the plate ≈ same magnitude, normal component destroyed.
- F_plate_on_fluid = ṁ(0 − (−V)) normal to plate = ρAV²; force ON plate = ρAV² in the jet direction.
- Inclined plate at angle θ to the jet: normal component only — F = ρAV² sin θ (for perfect normal-only deflection models).

**Moving vane (e.g. Pelton bucket):**
- Relative velocity at inlet: V_r = V − u (u = vane speed).
- Force on vane: F = ṁ_rel × (V_r,in − V_r,out)_normal. For a smooth vane turning flow by angle β (deflection angle from the incoming relative direction): specific work per mass = u(V − u)(1 + cos β); maximum power when u = V/2.

**Pipe bend / nozzle reaction:**
- Draw a CV around the bend; include inlet/outlet momentum fluxes and pressure forces (use gauge pressure for convenience since p_atm cancels in a CV open to atmosphere elsewhere).
- Solve for the flange/bolting force needed to hold the bend in place — the number a piping engineer actually orders from.

**Impulse–momentum reality checks:** viscous shear and gravity are often small compared with momentum change in high-speed jets; neglected terms must be justified, not silently dropped.`,
        extras: [
          table('Situation', ['Force on solid (magnitude, key term)'], [
            ['Normal jet, flat plate', 'ρAV²'],
            ['Jet on incline θ', 'ρAV² sin θ (normal component)'],
            ['Smooth moving vane, deflection β', 'ṁ_rel(V_r,in − V_r,cos β)'],
            ['Pelton max power', 'at u = V/2'],
            ['Pipe bend CV', 'ΣF = ṁ(V_out − V_in) with pressure terms'],
          ]),
          tip(
            'Newton III on every jet problem',
            'Compute the force on the FLUID first via the momentum equation; the force on the plate/bend is the negative of that — fewer sign errors.',
          ),
          warn(
            'Do not mix absolute and relative velocity in moving-vane problems',
            'Momentum flux through the CV uses absolute velocities; the vane\'s work interaction uses relative velocities — keep both straight or the Pelton formula comes out wrong.',
          ),
        ],
        worked: {
          title: 'Jet force on a fixed plate',
          problem: 'Water jet (ρ = 1000) hits a large stationary flat plate normally: V = 15 m/s, d = 40 mm. Find the force on the plate.',
          steps: [
            { title: 'Area and mass flow', desc: 'A = π(0.04)²/4 ≈ 0.001257 m²; ṁ = ρAV = 1000 × 0.001257 × 15 ≈ 18.85 kg/s.' },
            { title: 'Momentum change (fluid)', desc: 'Normal component goes from V to ~0 (spreads parallel): ΔV_normal = 0 − 15 = −15 m/s.' },
            { title: 'Force on fluid', desc: 'F_fluid = ṁ ΔV = 18.85 × (−15) ≈ −283 N (in −jet direction).' },
            { title: 'Force on plate', desc: 'Newton III: F_plate = +283 N in the jet direction ≈ 0.28 kN.' },
            { title: 'Direct formula check', desc: 'ρAV² = 1000 × 0.001257 × 225 ≈ 283 N ✓.' },
          ],
          solution: 'F ≈ 283 N (≈ 0.28 kN) pushing the plate in the jet direction.',
        },
        practice: {
          title: 'Pelton bucket force',
          prompt: 'Same jet, but on a bucket moving at u = 7.5 m/s with smooth 180° relative deflection (β = 180° in the relative frame). Find the force on the bucket.',
          hint: 'Use V_r = V − u for the mass-flow striking the moving vane.',
        },
        mistakes: [
          {
            mistake: 'Using absolute jet velocity in the ṁ for a moving vane',
            fix: 'Mass striking the vane per second is ρA(V − u), not ρAV — the vane moves away from some of the jet.',
          },
          {
            mistake: 'Forgetting pressure-force terms on a CV with pressurised inlets',
            fix: 'ΣF = pressure on CS + gravity + reaction; omitting gauge pressure on a closed bend inlet gives wrong anchoring forces.',
          },
        ],
        exam: {
          question: 'Derive the force exerted by a horizontal water jet on a stationary flat plate held normal to the jet.',
          answer: 'CV around the impact region: inlet momentum flux ṁV normal to the plate; outlet spreads with ~zero normal component. ΣF_on_fluid = ṁ(0 − V) = −ρAV². By Newton\'s third law the force on the plate is ρAV² in the jet direction.',
          source: 'Standard jet-impact derivation.',
        },
        summary: [
          'ΣF = ṁ(V_out − V_in) for steady CVs; always include pressure + reaction forces.',
          'Normal flat plate: F = ρAV²; moving vane uses relative velocity.',
          'Pipe bends: solve for anchoring force with gauge-pressure terms on the control surface.',
        ],
      }),
      [
        [
          'Force of a jet (ρAV²-scale) on a stationary flat plate normal to the flow is:',
          ['ρAV', 'ρAV²', '½ρAV²', '2ρAV²'],
          1,
          'Momentum flux fully destroyed in the normal direction.',
        ],
        [
          'For a Pelton bucket, maximum power transfer occurs when bucket speed u equals:',
          ['V', 'V/2', 'V/4', '0'],
          1,
          'Classic u = V/2 optimum for impulse turbines.',
        ],
        [
          'In the momentum equation for a pipe bend, ΣF includes:',
          ['Only gravity', 'Pressure on CS + gravity + reaction', 'Only momentum fluxes', 'Only friction'],
          1,
          'Full control-surface force balance.',
        ],
      ]
    ),
    lesson(
      M3,
      'fm-3-2',
      2,
      'Pipe Flow: Darcy–Weisbach & Losses',
      'Major friction losses, minor losses, Moody diagram reading, and solving single-pipe systems with the energy equation.',
      13,
      nineBlocks({
        objectives: [
          'Apply Darcy–Weisbach for major head loss with the correct friction factor',
          'Compute minor losses with loss coefficients and combine with major losses',
          'Read the Moody diagram (laminar vs turbulent, rough vs smooth) and solve for unknown diameter or length',
        ],
        hook:
          'A 100 mm water main and a 90 mm one can differ in pump power by more than 40% — head loss scales roughly with V² and strongly with diameter. Pipe sizing is the everyday application of viscous-flow theory, and Darcy–Weisbach is the equation behind every pump datasheet.',
        concept: `**Laminar vs turbulent (Reynolds number):**
Re = ρVD/μ = VD/ν
- Pipe flow: Re < ~2300 laminar; > ~4000 turbulent; in between — transitional (unstable).
- Laminar friction factor: f = 64/Re (Darcy) — exact for circular pipes.

**Darcy–Weisbach major loss:**
h_f = f (L/D) (V²/2g)
- f from Moody/Colebrook for turbulent flow: 1/√f = −2 log₁₀( (ε/D)/3.7 + 2.51/(Re√f) ) — implicit; Swamee–Jain explicit approximation is fine for exams.
- ε = absolute roughness (commercial steel ~0.045 mm, drawn copper ~0.0015 mm, concrete ~0.3–3 mm — memorise the steel value for exams).
- Fully rough (high Re): f depends on ε/D only; smooth-pipe (low Re turbulent): f depends on Re only.

**Minor losses (fittings, entrances, exits, bends, valves):**
h_m = K V²/2g, sum over all fittings — each K is empirical (sharp entrance ~0.5, well-rounded ~0.05, exit to reservoir ~1.0, 90° regular elbow ~0.3–0.9, gate valve wide open ~0.2 — order-of-magnitude values).

**Total system head (energy equation between two reservoirs):**
Δz = h_pump = h_f + Σh_m (for pump-driven flow between large tanks; static lift Δz plus all losses).

**Non-circular ducts:** use hydraulic diameter D_h = 4A/P (perimeter); apply Darcy with D_h — works for annuli, square ducts, etc.

**Series/parallel pipes:** series: same Q, add h_f; parallel: same h_f, split Q. Solve with continuity + loss equations.`,
        extras: [
          table('Quantity', ['Formula / value'], [
            ['Reynolds number', 'Re = VD/ν'],
            ['Laminar f (Darcy)', 'f = 64/Re'],
            ['Darcy–Weisbach loss', 'h_f = f(L/D)(V²/2g)'],
            ['Minor loss', 'h_m = K V²/2g'],
            ['Hydraulic diameter', 'D_h = 4A/P'],
            ['Steel ε', '~0.045 mm'],
          ]),
          tip(
            'Check the flow regime before grabbing Moody',
            'Re < 2300 ⇒ f = 64/Re exactly — no diagram needed; only turbulent flow requires the Moody/Colebrook route.',
          ),
          warn(
            'Darcy f is 4× the Fanning f used in some chemistry texts',
            'ME/CE exams use Darcy (Moody, h_f = f L/D V²/2g). If a question quotes Fanning, multiply by 4 — read carefully.',
          ),
        ],
        worked: {
          title: 'Steel pipe major loss',
          problem: 'Water (ν = 1×10⁻⁶ m²/s) flows at 2 m/s in a 100 mm ID commercial-steel pipe, L = 50 m. Find h_f.',
          steps: [
            { title: 'Reynolds number', desc: 'Re = VD/ν = 2 × 0.1 / 1e-6 = 2×10⁵ — turbulent.' },
            { title: 'Relative roughness', desc: 'ε/D = 0.045/100 = 0.00045.' },
            { title: 'Friction factor', desc: 'Colebrook/Swamee–Jain with Re = 2e5, ε/D = 0.00045 gives f ≈ 0.016–0.017 (read Moody: slightly rough regime).' },
            { title: 'Head loss', desc: 'h_f = f(L/D)(V²/2g) = 0.0165 × (50/0.1) × (4/19.62) ≈ 0.0165 × 500 × 0.204 ≈ 1.68 m.' },
            { title: 'Pump implication', desc: 'A pump serving this line needs ≥ 1.68 m of friction head plus static lift and minor losses.' },
          ],
          solution: 'h_f ≈ 1.7 m of water for the 50 m steel line at 2 m/s.',
        },
        practice: {
          title: 'Diameter sensitivity',
          prompt: 'Halve the diameter at the same volumetric flow rate (so V quadruples). How does h_f scale? Roughly what factor?',
          hint: 'h_f ~ V²/D ~ Q²/D⁵ at constant Q.',
        },
        mistakes: [
          {
            mistake: 'Using the smooth-pipe formula for old rusty concrete',
            fix: 'Fully rough flow ignores Re — use the rough-zone f(ε/D) from Moody, not the Blasius smooth correlation.',
          },
          {
            mistake: 'Adding minor-loss K values without converting to a common velocity head',
            fix: 'Each K multiplies the LOCAL V²/2g at that fitting — different pipe sizes need local velocities or an equivalent-length conversion.',
          },
        ],
        exam: {
          question: 'State the Darcy–Weisbach equation and define each term. How is f obtained for laminar vs turbulent flow?',
          answer: 'h_f = f (L/D) (V²/2g): f = Darcy friction factor (dimensionless), L length, D internal diameter, V mean velocity, g gravity. Laminar (Re < 2300): f = 64/Re exactly. Turbulent: from Moody diagram or Colebrook equation using Re and relative roughness ε/D.',
          source: 'Evergreen pipe-flow question.',
        },
        summary: [
          'Re decides laminar (f = 64/Re) vs turbulent (Moody/Colebrook).',
          'h_f = f(L/D)V²/2g major; h_m = K V²/2g minor; hydraulic diameter for non-circular.',
          'Series: add losses at common Q; parallel: split Q at common h_f.',
        ],
      }),
      [
        [
          'For laminar pipe flow (Re < 2300), the Darcy friction factor is:',
          ['64/Re', '0.079/Re^0.25', 'Constant 0.02', 'ε/D only'],
          0,
          'Exact Hagen–Poiseuille result.',
        ],
        [
          'Darcy–Weisbach head loss is:',
          ['f(L/D)(V²/2g)', 'fL V²/(2gD)', 'Both A and B are the same expression', 'K V²/2g only'],
          2,
          'Same formula written with D/L or L/D grouping — check the given form.',
        ],
        [
          'A sharp-edged pipe entrance typically contributes a minor loss coefficient K of about:',
          ['0.05', '0.5', '5.0', '1.0 only at exit'],
          1,
          'Well-rounded entrances drop to ~0.05; exit to a reservoir is ~1.0.',
        ],
      ]
    ),
  ],
};
