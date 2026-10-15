// Module 1 — Fluid Statics
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — Fluid Statics',
  summary:
    'Pressure variation with depth, manometers, Pascal\'s law, buoyancy (Archimedes), and hydrostatic forces on plane and curved surfaces.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'fm-1-1',
      1,
      'Pressure, Manometers & Hydrostatic Force',
      'The hydrostatic law, absolute vs gauge pressure, piezometric head, and computing resultant force + centre of pressure on submerged plane surfaces.',
      13,
      nineBlocks({
        objectives: [
          'Apply the hydrostatic law to find pressure at any depth in a static fluid',
          'Distinguish absolute, gauge and vacuum pressure; compute with manometers',
          'Locate the centre of pressure and resultant hydrostatic force on a plane surface',
        ],
        hook:
          'A dam wall two metres thick at the base and a submarine hull a few centimetres thick obey the same pressure-versus-depth law. Get the hydrostatic integral wrong and the structure fails; get it right and you can design tanks, manometers and hydraulic presses with the same three lines of algebra.',
        concept: `**Hydrostatic law:** dp/dz = −ρg (z measured upward). For constant ρ:
- p = p₀ + ρgh (pressure increases with depth)
- Two points at the same elevation in a connected static fluid of the same density have the same pressure (Pascal / hydrostatic paradox).

**Pressure measures:**
- Absolute: p_abs = p_atm + p_gauge
- Vacuum: p_vac = p_atm − p_abs when p_abs < p_atm (quoted as positive)
- Piezometric head: p/(ρg) + z = constant along a vertical in a static fluid — the workhorse of groundwater and manometer problems.

**Manometers:** balance pressure columns. U-tube with a gauge fluid of density ρ_m: walk from one leg to the other adding ρgh when descending, subtracting when ascending, set equal at the end.

**Hydrostatic force on a plane submerged surface:**
- Resultant magnitude: F = p_c × A, where p_c is pressure at the centroid of the submerged area A (works even if the surface is not horizontal, for constant Ϸ).
- Centre of pressure (where the resultant effectively acts): for a rectangular gate of width b hinged along the top edge submerged to depth h₁ with height h₂ below the hinge:
  y_cp = y_c + I_xx,c/(y_c × A)
  where y is measured along the surface from the free surface, y_c is centroid distance, I_xx,c is second moment about the centroidal axis parallel to the free surface.
- For a vertical rectangle from the surface: y_cp = (2/3)×height — always below the centroid, because pressure grows with depth.

**Curved surfaces:** resolve into horizontal component (force on the vertical projection, acting at its centroid-pressure point) and vertical component (weight of the fluid column above the curved surface, real or imaginary).`,
        extras: [
          table('Quantity', ['Formula / rule'], [
            ['Hydrostatic law', 'dp/dz = −ρg ⇒ p = p₀ + ρgh'],
            ['Absolute vs gauge', 'p_abs = p_atm + p_gauge'],
            ['Resultant on plane', 'F = p_c × A'],
            ['Centre of pressure', 'y_cp = y_c + I_xx,c/(y_c A)'],
            ['Vertical rect (from surface)', 'y_cp = (2/3) × height'],
          ]),
          tip(
            'Centroid shortcut for symmetric gates',
            'For a full-width rectangle whose top edge is at the free surface, y_c = h/2 and y_cp = 2h/3 — memorise the 2/3 result; the integral derivation is the proof.',
          ),
          warn(
            'Never use surface-average pressure on a tilted gate',
            'F = p_c × A is exact for constant ρ, but the centre of pressure is NOT the centroid unless the surface is horizontal.',
          ),
        ],
        worked: {
          title: 'Rectangular gate force and centre of pressure',
          problem: 'A vertical rectangular gate 2 m wide × 3 m high has its top edge 1 m below the free surface of water. Find F and y_cp (from the surface).',
          steps: [
            { title: 'Centroid depth', desc: 'Gate spans depth 1 m to 4 m; centroid at y_c = 1 + 3/2 = 2.5 m.' },
            { title: 'Area', desc: 'A = 2 × 3 = 6 m².' },
            { title: 'Resultant force', desc: 'F = ρg y_c A = 1000 × 9.81 × 2.5 × 6 ≈ 147.2 kN.' },
            { title: 'Second moment', desc: 'I_xx,c = b h³/12 = 2 × 3³/12 = 4.5 m⁴ (about centroidal axis parallel to surface).' },
            { title: 'Centre of pressure', desc: 'y_cp = y_c + I_xx,c/(y_c A) = 2.5 + 4.5/(2.5 × 6) = 2.5 + 0.3 = 2.8 m below the surface.' },
            { title: 'Sanity', desc: 'y_cp > y_c as expected (always below centroid for pressure growing with depth).' },
          ],
          solution: 'F ≈ 147 kN; centre of pressure at 2.8 m below the free surface (0.3 m below the centroid).',
        },
        practice: {
          title: 'Inverted gate',
          prompt: 'Same gate but with its BOTTOM edge at the free surface (extending upward is impossible — so flip: bottom edge just below surface, extending downward 3 m). Where is y_cp relative to the centroid now vs the previous case?',
          hint: 'Top edge at 0, bottom at 3 m — compute y_c and compare.',
        },
        mistakes: [
          {
            mistake: 'Using p = ρgh with h measured from the bottom of the tank',
            fix: 'h is always depth below the FREE SURFACE (or the piezometric reference) — fix the datum first.',
          },
          {
            mistake: 'Setting y_cp = y_c for a vertical or tilted gate',
            fix: 'Only a horizontal surface has y_cp = y_c; everywhere else the deeper, higher-pressure part pulls the resultant down.',
          },
        ],
        exam: {
          question: 'Define centre of pressure and state why it does not coincide with the centroid of a vertical submerged plane.',
          answer: 'Centre of pressure is the point where the resultant hydrostatic force effectively acts. For a vertical surface, pressure increases linearly with depth, so the lower half contributes more force than the upper half, shifting the resultant below the centroid (y_cp = y_c + I_xx,c/(y_c A) > y_c).',
          source: 'Standard definition + reasoning question.',
        },
        summary: [
          'dp/dz = −ρg; p = p₀ + ρgh with h from the free surface.',
          'F on a plane = p_c × A; y_cp always ≥ y_c for non-horizontal surfaces.',
          'Curved surfaces decompose into horizontal (projected vertical area) + vertical (fluid weight) components.',
        ],
      }),
      [
        [
          'In a static fluid, pressure varies with depth as:',
          ['Linearly increasing', 'Exponentially', 'Constant', 'Parabolically'],
          0,
          'p = p₀ + ρgh — linear in h for constant ρ.',
        ],
        [
          'For a vertical rectangular gate with its top edge at the free surface, the centre of pressure is at:',
          ['h/2', '2h/3', '3h/4', 'h'],
          1,
          'Classic 2/3 result — below the centroid.',
        ],
        [
          'The resultant hydrostatic force on a plane submerged surface equals:',
          ['Pressure at the top edge × Area', 'Pressure at the centroid × Area', 'Pressure at the bottom edge × Area', 'Weight of the fluid only'],
          1,
          'F = p_c × A is exact for constant density.',
        ],
      ]
    ),
    lesson(
      M1,
      'fm-1-2',
      2,
      'Buoyancy, Stability & Fluid Acceleration',
      'Archimedes\' principle, metacentre height and floating-body stability, and fluid acceleration (rigid-body motion) including the horizontal barometer effect.',
      13,
      nineBlocks({
        objectives: [
          'Apply Archimedes\' principle to find buoyant force and equilibrium draft',
          'Explain metacentre, GM and the stability criterion for floating bodies',
          'Compute pressure variation in a fluid accelerating horizontally or vertically',
        ],
        hook:
          'Why does a steel ship float while a steel cube sinks? Archimedes answers "why it floats"; the metacentre answers "why it does not capsize". Every naval architecture and offshore engineering problem starts with these two ideas.',
        concept: `**Archimedes' principle:** the buoyant force equals the weight of fluid displaced, acting upward through the centre of buoyancy (centroid of the displaced volume).
- Floating equilibrium: Weight of body = weight of displaced fluid; solve for draft/displaced volume.
- Submerged completely: if ρ_body > ρ_fluid, it sinks (needs external force or a hollow hull to reduce average density).

**Floating stability — metacentre:**
- Centre of buoyancy B; as the body heels by a small angle θ, B moves to B′.
- Metacentre M: the point where the new vertical through B′ intersects the original centreline.
- BM = I/V_displaced, where I is the second moment of the waterplane area about the tilt axis.
- GM = MB (distance from M to the centre of gravity G, measured positive upward from G).
- **Stable if GM > 0** (M above G); neutral if GM = 0; unstable (capsizes) if GM < 0.
- Large BM (wide waterplane) or low G (ballast low, tall structures top-heavy) — the design levers.

**Rigid-body fluid acceleration:**
- Horizontal acceleration a_x: free surface tilts, dp/dx = −ρa_x, dp/dz = −ρ(g). Resultant surface slope: tan α = a_x/g (surface normal leans opposite the acceleration).
- Vertical acceleration a_z: effective gravity g_eff = g ± a_z; p = ρ(g ± a_z)h — a lift accelerating upward increases apparent weight/pressure; free fall (a_z = −g) makes the fluid weightless (p = 0 inside).

**Relative equilibrium:** fluid at rest relative to an accelerating container — use a coordinate system attached to the container and replace g with g_eff = g − a (vector subtraction).`,
        extras: [
          table('Quantity', ['Formula / meaning'], [
            ['Buoyant force', 'F_B = ρ_fluid g V_displaced'],
            ['Floating equilibrium', 'W_body = F_B'],
            ['Metacentric radius', 'BM = I / V_disp'],
            ['Stability', 'GM > 0 stable; M above G'],
            ['Horizontal acceleration', 'surface slope tan α = a_x/g'],
            ['Vertical acceleration', 'g_eff = g ± a_z'],
          ]),
          tip(
            'Ballast low, structures high',
            'Lowering G (heavy keel) or widening the waterplane (raising I, hence BM) both increase GM and improve stability.',
          ),
          warn(
            'GM > 0 is necessary but not the whole story',
            'Large-angle stability (GZ curves) matters in real ships; GM is the small-angle (initial) stability measure exam problems test.',
          ),
        ],
        worked: {
          title: 'Floating box draft and metacentre',
          problem: 'A rectangular box 3 m × 2 m × 1 m high (horizontal base 3×2) floats in water (ρ = 1000), total mass 4000 kg, G at 0.4 m above the base. Find draft and GM.',
          steps: [
            { title: 'Equilibrium draft', desc: 'Weight = 4000 × 9.81; F_B = ρg × (3×2×d). Set equal: 39240 = 1000×9.81×6d ⇒ 6d = 4 ⇒ d = 0.667 m draft.' },
            { title: 'Displaced volume', desc: 'V = 6 × 0.667 ≈ 4 m³; B is at d/2 = 0.333 m above the base (centroid of displaced prism).' },
            { title: 'Metacentric radius', desc: 'I about the tilt axis (through centroid of waterplane 3×2, tilting about the 2-m-wide axis): I = (2 × 3³)/12 = 4.5 m⁴. BM = I/V = 4.5/4 = 1.125 m.' },
            { title: 'M height', desc: 'M is 1.125 m above B: height of M above base = 0.333 + 1.125 = 1.458 m.' },
            { title: 'GM', desc: 'G at 0.4 m above base: GM = 1.458 − 0.4 = +1.058 m > 0 — stable.' },
          ],
          solution: 'Draft ≈ 0.67 m; BM ≈ 1.13 m; GM ≈ +1.06 m — initially stable floating body.',
        },
        practice: {
          title: 'Top-heavy check',
          prompt: 'If the same box\'s centre of gravity rises to 1.5 m above the base, what happens to GM and the stability verdict?',
          hint: 'M height unchanged (depends on B and I only); compare to new G.',
        },
        mistakes: [
          {
            mistake: 'Measuring GM from the waterline instead of from G',
            fix: 'GM = (height of M) − (height of G) — both measured from a common datum such as the keel/base.',
          },
          {
            mistake: 'Using g in a vertically accelerating lift problem',
            fix: 'Replace with g_eff = g ± a_z; upward acceleration increases apparent fluid density/pressure effects.',
          },
        ],
        exam: {
          question: 'Define metacentre and state the small-angle stability criterion for a floating body.',
          answer: 'The metacentre M is the point where the vertical through the shifted buoyancy centre B′ (after a small heel angle) intersects the original centreline. For small angles, the body is stable if M lies above G, i.e. GM > 0; it returns to upright. If GM < 0 the couple after a small tilt capsizes the body.',
          source: 'Evergreen naval-architecture / FM short question.',
        },
        summary: [
          'F_B = ρ_fluid g V_disp; floating bodies displace their own weight.',
          'BM = I/V_disp; stable ⇔ GM = (height of M) − (height of G) > 0.',
          'Accelerating fluids: tilt the surface (a_x/g) or scale g with a_z.',
        ],
      }),
      [
        [
          'A body floats in equilibrium when:',
          ['Buoyant force equals the weight of the body', 'Buoyant force equals the weight of the body\'s material only', 'Density of body equals density of fluid always', 'Buoyant force is zero'],
          0,
          'Weight of displaced fluid = total weight of body.',
        ],
        [
          'A floating body is (initially) stable when:',
          ['GM < 0', 'GM = 0 only', 'GM > 0 (metacentre above G)', 'G is above M'],
          2,
          'Small-angle stability criterion.',
        ],
        [
          'In rigid-body horizontal acceleration a_x, the free surface slope satisfies:',
          ['tan α = g/a_x', 'tan α = a_x/g', 'tan α = 0', 'tan α = a_x·g'],
          1,
          'Surface normal leans opposite the acceleration vector.',
        ],
      ]
    ),
  ],
};
