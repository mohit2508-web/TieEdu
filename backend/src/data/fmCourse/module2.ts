// Module 2 — Kinematics & Bernoulli
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Kinematics & Bernoulli',
  summary:
    'Velocity and acceleration fields, streamlines/pathlines, flow nets, and the Bernoulli equation with applications to orifices, venturimeters and Pitot tubes.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'fm-2-1',
      1,
      'Flow Kinematics & the Bernoulli Equation',
      'Eulerian description, material acceleration, streamline vs pathline, irrotational flow, and deriving/using Bernoulli along a streamline with losses.',
      13,
      nineBlocks({
        objectives: [
          'Compute convective and local acceleration from a velocity field',
          'Distinguish streamline, pathline and streakline; state when they coincide',
          'Apply Bernoulli between two points with head-loss terms correctly',
        ],
        hook:
          'Bernoulli\'s equation is the fluid-mechanics analogue of energy conservation — but it only holds along a streamline in steady, inviscid, incompressible flow. Interviewers love asking where it breaks (across a shock, through a pump, with friction), and that is exactly where the marks are.',
        concept: `**Eulerian vs Lagrangian:** Eulerian watches a fixed control volume (velocity field V(x,y,z,t)); Lagrangian follows fluid particles. Most engineering analysis is Eulerian.

**Velocity field and acceleration (material derivative):**
a = dV/dt = ∂V/∂t + (V·∇)V
- Local (unsteady) term: ∂V/∂t
- Convective term: (V·∇)V — nonzero even in steady flow if the path is not a straight line of uniform velocity (e.g. flow through a nozzle).

**Streamlines:** curves tangent to V at an instant; dx/u = dy/v = dz/w. Pathlines: actual particle histories. Streaklines: loci of particles that passed through a fixed point (dye/smoke injection).
- Steady flow ⇒ all three coincide. Unsteady ⇒ they diverge.

**Rotational vs irrotational:** fluid particle spinning about its own axis. Irrotational (vorticity = 0) is the assumption that unlocks velocity potentials — ideal for external flow around bodies.

**Bernoulli (steady, incompressible, inviscid, along a streamline):**
p/(ρg) + V²/(2g) + z = constant = total (Bernoulli) head
- p/ρg = pressure head; V²/2g = velocity head; z = elevation head.
- Between two points with a pump (head added H_p), turbine (removed H_t) and losses (h_L):
  p₁/(ρg) + V₁²/(2g) + z₁ + H_p − H_t − h_L = p₂/(ρg) + V₂²/(2g) + z₂

**When Bernoulli breaks:** across a hydraulic jump or normal shock (finite losses), through regions with viscosity boundary layers (total head drops), between different streamlines in rotational flow (each streamline has its own constant).

**Applications:**
- Orifice/venturi: derive velocity from a pressure drop (Q = C_d A √(2Δh) style).
- Pitot-static tube: stagnation point V = 0 gives V = √(2(p₀ − p)/(ρ)) = √(2gh).
- Free jet from a tank: Torricelli V = √(2gh).`,
        extras: [
          table('Head term', ['Symbol / meaning'], [
            ['Pressure head', 'p/(ρg)'],
            ['Velocity head', 'V²/(2g)'],
            ['Elevation head', 'z'],
            ['Total head', 'sum of the three (constant on a streamline)'],
            ['Head loss', 'h_L (viscous/friction, always positive downstream)'],
          ]),
          tip(
            'Always pick a datum for z',
            'Set z = 0 at the most convenient point (usually the lower port or free surface) so the elevation term disappears cleanly.',
          ),
          warn(
            'Bernoulli ≠ energy equation for machines',
            'Across pumps/turbines include H_p/H_t explicitly or use the full steady-flow energy equation with shaft work.',
          ),
        ],
        worked: {
          title: 'Pitot tube airspeed',
          problem: 'A Pitot-static probe in air (ρ = 1.2 kg/m³) measures (p₀ − p) = 300 Pa. Find the flow velocity.',
          steps: [
            { title: 'Stagnation point', desc: 'At the probe nose, V₂ = 0; Bernoulli along the streamline: p₁/(ρ) + V₁²/2 = p₂/(ρ) + 0.' },
            { title: 'Rearrange', desc: 'V₁² = 2(p₂ − p₁)/ρ = 2 × 300 / 1.2.' },
            { title: 'Compute', desc: 'V₁² = 500 ⇒ V₁ = √500 ≈ 22.36 m/s.' },
            { title: 'Compressibility check', desc: 'Mach ≈ 22.36/340 ≈ 0.066 « 0.3 — incompressible assumption valid.' },
            { title: 'Practical note', desc: 'Real probes need a calibration factor C_d near 1; formula above is ideal.' },
          ],
          solution: 'V ≈ 22.4 m/s from the stagnation-pressure difference.',
        },
        practice: {
          title: 'Nozzle convective acceleration',
          prompt: 'Steady 1-D flow through a shrinking nozzle: does the material acceleration have a nonzero convective term? Explain without numbers.',
          hint: 'V changes along the path even though ∂V/∂t = 0.',
        },
        mistakes: [
          {
            mistake: 'Applying one Bernoulli constant across different streamlines in rotational flow',
            fix: 'Each streamline has its own constant in rotational flow; only irrotational flow gives a domain-wide constant.',
          },
          {
            mistake: 'Forgetting h_L when the problem mentions pipe friction or a long duct',
            fix: 'Real pipes always lose head; only "negligible friction" exam setups drop h_L.',
          },
        ],
        exam: {
          question: 'State the assumptions behind Bernoulli\'s equation and one engineering application.',
          answer: 'Steady, incompressible, inviscid flow, valid along a streamline (or across the whole field if additionally irrotational). Application examples: Pitot-static airspeed (stagnation pressure), venturi flow measurement, orifice/tank efflux (Torricelli).',
          source: 'Standard assumptions + application question.',
        },
        summary: [
          'Acceleration = local ∂V/∂t + convective (V·∇)V.',
          'Streamline = pathline = streakline only in steady flow.',
          'Bernoulli: p/ρg + V²/2g + z = constant along a streamline (with H_p/H_t/h_L as needed).',
        ],
      }),
      [
        [
          'In steady flow, streamlines, pathlines and streaklines:',
          ['All differ', 'All coincide', 'Only streamlines and streaklines coincide', 'Are undefined'],
          1,
          'Time-independence collapses all three.',
        ],
        [
          'Bernoulli\'s equation is strictly valid:',
          ['Everywhere in any flow', 'Along a streamline in steady inviscid incompressible flow', 'Only in viscous boundary layers', 'Across shocks'],
          1,
          'Plus irrotational for a domain-wide constant.',
        ],
        [
          'The convective acceleration term is:',
          ['∂V/∂t', '(V·∇)V', 'V × ω', 'g only'],
          1,
          'Nonzero even in steady flow through a nozzle.',
        ],
      ]
    ),
    lesson(
      M2,
      'fm-2-2',
      2,
      'Flow Measurement: Venturi, Orifice & Nozzles',
      'Differential-pressure flow meters, discharge coefficients, and sizing orifice/venturi problems with manometer readings.',
      13,
      nineBlocks({
        objectives: [
          'Derive the theoretical discharge through a venturi or orifice from Bernoulli + continuity',
          'Use the discharge coefficient C_d correctly in practice problems',
          'Compare venturi (low loss) vs orifice (cheap, high loss) meter trade-offs',
        ],
        hook:
          'A venturi meter in a water main can meter municipal supply to ±1% while wasting almost no pressure; an orifice plate costs a fraction of that but eats head for breakfast. Choosing between them is a pure engineering-economics decision anchored in two applications of Bernoulli.',
        concept: `**Differential pressure meters — the common thread:**
1. Bernoulli between the upstream (1) and throat/vena-contracta (2) along a horizontal streamline: p₁ + ½ρV₁² = p₂ + ½ρV₂².
2. Continuity: A₁V₁ = A₂V₂ ⇒ V₁ = (A₂/A₁)V₂.
3. Solve for V₂: V₂ = √[2(p₁ − p₂)/(ρ(1 − (A₂/A₁)²))]
4. Actual discharge: Q_actual = C_d A₂ V₂,th where C_d accounts for real losses and contraction.

**Venturi meter:** gradual convergence then slow diffuser — C_d ≈ 0.95–0.98, very low permanent head loss (most pressure recovered in the diffuser). Used when downstream head matters (water distribution).

**Orifice meter:** thin plate with a sharp-edged hole; vena contracta forms downstream. C_d ≈ 0.6–0.65 (area ratio dependent). Cheap, easy to install, but large permanent pressure loss (~60–80% of Δp is not recovered).

**Nozzle meter:** between the two — C_d ≈ 0.96, moderate loss, robust for dirty fluids.

**Manometer reading:** for a U-tube with gauge fluid ρ_m between the two taps:
(p₁ − p₂)/(ρg) = h(ρ_m/ρ − 1) — the classic (SG − 1)h form. Substitute into the discharge formula for Q in terms of manometer deflection h.

**Pitot-static (already seen):** velocity at a point, not a full-line discharge — V = √(2Δp/ρ).`,
        extras: [
          table('Meter', ['Typical C_d', 'Permanent loss'], [
            ['Venturi', '0.95–0.98', 'Very low (diffuser recovers pressure)'],
            ['Orifice (sharp-edged)', '0.60–0.65', 'High (~60–80% of Δp)'],
            ['Nozzle', '~0.96', 'Moderate'],
            ['Pitot-static', '~1 (calibrated)', 'None (single-point velocity)'],
          ]),
          tip(
            'Always square-root the pressure term',
            'Discharge goes as √Δp — doubling the flow roughly quadruples the manometer reading; exam questions test this scaling constantly.',
          ),
          warn(
            'Do not forget the (1 − β⁴) contraction term',
            'β = d₂/d₁; omitting (1 − β⁴) under the radical is only valid for d₂ « d₁ (e.g. large tank drain).',
          ),
        ],
        worked: {
          title: 'Venturi discharge from manometer reading',
          problem: 'Horizontal water venturi: d₁ = 100 mm, d₂ = 50 mm, mercury manometer reads 150 mm. C_d = 0.98, ρ_Hg = 13600, ρ_w = 1000. Find Q.',
          steps: [
            { title: 'Area ratio', desc: 'β = 50/100 = 0.5; A₂/A₁ = 0.25; (A₂/A₁)² = 0.0625.' },
            { title: 'Manometer Δp/ρg', desc: 'h(ρ_m/ρ − 1) = 0.15 × (13.6 − 1) = 0.15 × 12.6 = 1.89 m of water.' },
            { title: 'Throat velocity', desc: 'V₂,th = √[2g × 1.89 / (1 − 0.0625)] = √[2 × 9.81 × 1.89 / 0.9375] ≈ √39.26 ≈ 6.27 m/s.' },
            { title: 'Area', desc: 'A₂ = π(0.05)²/4 ≈ 0.001963 m².' },
            { title: 'Actual discharge', desc: 'Q = C_d A₂ V₂ = 0.98 × 0.001963 × 6.27 ≈ 0.0120 m³/s ≈ 12.0 L/s.' },
          ],
          solution: 'Q ≈ 0.012 m³/s (12 L/s) with the venturi contraction and discharge coefficient applied.',
        },
        practice: {
          title: 'Orifice vs venturi loss',
          prompt: 'Same Δp and throat size: which passes more flow (before permanent loss), and which wastes more downstream pressure? Explain.',
          hint: 'C_d differences vs permanent recovery.',
        },
        mistakes: [
          {
            mistake: 'Using throat AREA without the discharge coefficient for real flow',
            fix: 'Q_actual = C_d × A × V_theoretical; skipping C_d is only OK for ideal-theory questions.',
          },
          {
            mistake: 'Mixing mm and m in the manometer term',
            fix: 'Convert h to metres (or consistent units) before multiplying by (ρ_m/ρ − 1) — a silent 1000× error otherwise.',
          },
        ],
        exam: {
          question: 'Derive the theoretical velocity at a venturi throat and explain the role of the discharge coefficient.',
          answer: 'Bernoulli + continuity: V₂ = √[2(p₁−p₂)/(ρ(1 − β⁴))], β = d₂/d₁. C_d multiplies this to give actual flow, accounting for viscous losses and (for orifices) vena-contracta contraction; hence Q_actual = C_d A₂ V₂,th with C_d < 1.',
          source: 'Classic derivation question.',
        },
        summary: [
          'Differential meters combine Bernoulli + continuity; Q ~ √Δp.',
          'Venturi: high C_d, low loss; orifice: low C_d, cheap, high loss.',
          'Manometer: Δp/ρg = h(SG_m − 1); always apply C_d for actual discharge.',
        ],
      }),
      [
        [
          'A venturi meter typically has a discharge coefficient of:',
          ['0.6', '0.75', '0.95–0.98', '1.2'],
          2,
          'Efficient diffusion recovers most pressure.',
        ],
        [
          'For a differential pressure flow meter, discharge Q is proportional to:',
          ['Δp', '√Δp', '1/√Δp', 'Δp²'],
          1,
          'Square-root relationship from Bernoulli.',
        ],
        [
          'An orifice meter compared to a venturi of the same line size has:',
          ['Higher C_d and lower permanent loss', 'Lower C_d and higher permanent loss', 'Same C_d', 'No permanent loss'],
          1,
          'Vena contracta + no diffuser recovery.',
        ],
      ]
    ),
  ],
};
