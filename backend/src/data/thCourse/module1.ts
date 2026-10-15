// Module 1 — Foundations: Laws, States & Properties
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — Foundations: Laws, States & Properties',
  summary:
    'Thermodynamic systems and state postulate, zeroth/first/second laws, work and heat sign conventions, and pure-substance property lookup.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'th-1-1',
      1,
      'Systems, State & the Four Laws',
      'Control mass vs control volume, the state postulate, zeroth through second laws with the Clausius inequality, and theKelvin–Planck statement.',
      13,
      nineBlocks({
        objectives: [
          'Classify systems (open/closed/isolated) and apply the state postulate',
          'State the zeroth, first, second and third laws and what each forbids',
          'Use Clausius inequality to decide if a cycle is possible, reversible or impossible',
        ],
        hook:
          'A heat engine that converted all heat to work would end civilization\'s energy crisis overnight — the Second Law says it is not just hard, it is mathematically forbidden. Every power plant, refrigerator and living cell obeys the same boundary.',
        concept: `**System vocabulary:**
- **Open (control volume):** mass crosses boundary — turbines, nozzles, compressors.
- **Closed (control mass):** fixed mass, energy crosses as heat/work — piston-cylinder.
- **Isolated:** neither mass nor energy — universe as a whole (theoretical).
- **State postulate:** two independent intensive properties fix the state of a simple compressible system — the foundation of every property table.

**Zeroth law:** if A equilibrates with B and B with C, then A with C — defines temperature and makes thermometers possible.

**First law (energy conservation):** for a closed system, δQ − δW = dU; path-independent U, path-dependent Q and W. Rate form: Q̇ − Ẇ = dU/dt. For a control volume use the SFEE (steady-flow energy equation): Q̇ − Ẇ = ṁ(h₂ − h₁ + Δke + Δpe).

**Second law (directionality):** heat does not spontaneously flow cold→hot; work does not convert to heat with 100% efficiency in a cycle. Equivalent statements:
- **Clausius:** ∮δQ/T ≤ 0 (equality reversible).
- **Kelvin–Planck:** no cycle can convert heat entirely to work; some must reject to a low-T sink.
- **Entropy (Clausius definition):** dS = δQ_rev/T; for any process ΔS ≥ ∫δQ/T.

**Third law:** entropy of a perfect crystal at 0 K is zero — absolute zero is unreachable in finite steps.`,
        extras: [
          table('Law', ['One-line statement'], [
            ['Zeroth', 'Thermal equilibrium is transitive — temperature exists'],
            ['First', 'Energy is conserved: ΔU = Q − W (closed)'],
            ['Second', 'Entropy of an isolated system never decreases'],
            ['Third', 'S = 0 at 0 K for a perfect crystal; absolute 0 unattainable'],
          ]),
          tip(
            'Sign convention lock-in',
            'Q > 0 into system, W > 0 done BY system — pick this everywhere and never flip mid-problem.',
          ),
          warn(
            'First law cannot reject perpetual motion of the first kind',
            'Energy bookkeeping alone; the Second Law rejects the second kind (100%-efficient cycle).',
          ),
        ],
        worked: {
          title: 'Clausius inequality test',
          problem: 'A cycle receives 1000 kJ at 800 K and rejects 600 kJ at 300 K. Is it possible? Reversible?',
          steps: [
            { title: 'Compute ∮δQ/T', desc: '1000/800 − 600/300 = 1.25 − 2.00 = −0.75 kJ/K.' },
            { title: 'Compare to zero', desc: 'Negative, so Clausius inequality is satisfied — the cycle is possible.' },
            { title: 'Reversible?', desc: 'Equality holds only for reversible cycles. Here ∮δQ/T = −0.75 ≠ 0, so irreversible.' },
            { title: 'Cross-check efficiency', desc: 'η = 1 − 600/1000 = 0.40. Carnot bound at same temps: 1 − 300/800 = 0.625. 0.40 < 0.625 — consistent with irreversibility.' },
            { title: 'Verdict', desc: 'Possible and irreversible; if ∮δQ/T > 0 it would be impossible.' },
          ],
          solution: '∮δQ/T = −0.75 kJ/K < 0 → possible but irreversible (not a Carnot cycle).',
        },
        practice: {
          title: 'Inequality flip',
          prompt: 'A proposed cycle has ∮δQ/T = +0.2 kJ/K. What is the verdict, and why is the sign decisive?',
          hint: 'Clausius allows ≤ 0 only.',
        },
        mistakes: [
          {
            mistake: 'Treating Q and W as state functions',
            fix: 'Only U, H, S, T, P are state functions; Q and W are path-dependent — never write dQ, write δQ.',
          },
          {
            mistake: 'Applying the closed-system First law to a turbine',
            fix: 'Turbines are control volumes — use SFEE with enthalpy h, not internal energy U.',
          },
        ],
        exam: {
          question: 'State the Kelvin–Planck statement of the Second Law and its equivalence to Clausius.',
          answer: 'No cycle can have as its sole result the conversion of heat from a single reservoir entirely into work. Equivalence proof: assume a Clausius violator (net heat cold→hot with no work) and couple it to a Kelvin–Planck engine to build a forbidden engine.',
          source: 'Standard proof question in ME exams.',
        },
        summary: [
          'State postulate: two independent intensive properties fix a simple compressible state.',
          'Zeroth defines T; First conserves energy; Second sets direction; Third anchors S.',
          'Clausius inequality ∮δQ/T ≤ 0 is the universal cycle feasibility test.',
        ],
      }),
      [
        [
          'The state postulate requires how many independent intensive properties?',
          ['One', 'Two', 'Three', 'Equal to the number of phases'],
          1,
          'For a simple compressible system.',
        ],
        [
          '∮δQ/T > 0 for a cycle means:',
          ['The cycle is reversible', 'The cycle is impossible', 'The cycle is irreversible but possible', 'The system is isolated'],
          1,
          'Violates Clausius inequality.',
        ],
        [
          'Which quantity is a path function?',
          ['Internal energy', 'Entropy', 'Heat transfer', 'Enthalpy'],
          2,
          'Q and W are path functions; U, H, S are state functions.',
        ],
      ]
    ),
    lesson(
      M1,
      'th-1-2',
      2,
      'Work, Heat & Pure-Substance Properties',
      'Boundary work under polytropic processes, heat transfer modes, ideal-gas vs real-gas treatment, and steam-table / T–s diagram reading.',
      13,
      nineBlocks({
        objectives: [
          'Compute boundary work for polytropic, isobaric and isochoric processes',
          'Choose ideal-gas vs steam-table property evaluation correctly',
          'Read quality, saturation values and superheat from a T–s or steam table',
        ],
        hook:
          'The difference between "PV = mRT is fine here" and "you needed the steam tables" is the difference between a correct rankine-cycle efficiency and a wrong one that still looks plausible. Choosing the property model is half the marks.',
        concept: `**Boundary work (closed system):** W_b = ∫P dV.
- Constant P: W = P(V₂ − V₁)
- Isochoric (V = const): W = 0
- Polytropic (PVⁿ = const): W = (P₂V₂ − P₁V₁)/(1 − n) = mR(T₂ − T₁)/(1 − n) for ideal gas, n ≠ 1
- Isothermal ideal gas: W = mRT ln(V₂/V₁)

**Heat transfer modes:** conduction (Fourier, q = −k∇T), convection (Newton cooling, q̇ = hAΔT), radiation (Stefan–Boltzmann, q̇ = εσAT⁴).

**Ideal gas:** PV = mRT (or Pv = RT). Valid at high T, low P (far from saturation). u = u(T), h = h(T) only — composition of P,V does not affect them for ideal gases.

**Pure substance & phase:** at a given T, P_sat pairs. Quality x = m_vap/m_total in the wet region:
- v = v_f + x·v_fg; u = u_f + x·u_fg; h = h_f + x·h_fg; s similarly.
- x is undefined outside the dome (subcooled liquid, superheated vapor).
- Critical point: T_c, P_c — above it, no distinct liquid/vapor.

**Steam table use:**
1. Given (T, P): if P = P_sat(T) → two-phase; if P > P_sat → subcooled liquid (often use compressed liquid ≈ sat liquid at T); if P < P_sat → superheated vapor → use superheat tables.
2. Find quality if two-phase: x = (h − h_f)/h_fg.

**T–s diagram:** dome, constant-P lines (flat in two-phase, rise in single phase), Carnot rectangle as the reference cycle.`,
        extras: [
          table('Process', ['Work expression'], [
            ['Isobaric', 'P(V₂ − V₁)'],
            ['Isochoric', '0'],
            ['Polytropic PVⁿ', '(P₂V₂ − P₁V₁)/(1 − n)'],
            ['Isothermal ideal gas', 'mRT ln(V₂/V₁)'],
          ]),
          tip(
            'x undefined outside the dome',
            'Never compute quality for superheated or subcooled states — go straight to the correct table.',
          ),
          warn(
            'Ideal gas near saturation',
            'Steam at 100°C, 1 atm is NOT ideal-gas territory for property work — use steam tables; ideal gas is for hot, low-pressure gases.',
          ),
        ],
        worked: {
          title: 'Polytropic compression work',
          problem: 'Air (ideal gas) in a piston-cylinder: 300 K, 100 kPa compressed polytropically (n = 1.3) to 500 kPa. Find work per kg. R = 0.287 kJ/kg·K.',
          steps: [
            { title: 'Find T₂', desc: 'T₂/T₁ = (P₂/P₁)^((n−1)/n) = (5)^((0.3)/(1.3)) ≈ 5^0.2308 ≈ 1.441 ⇒ T₂ ≈ 432 K.' },
            { title: 'Work formula', desc: 'w = R(T₂ − T₁)/(1 − n) = 0.287 × (432 − 300)/(1 − 1.3).' },
            { title: 'Compute', desc: '0.287 × 132 / (−0.3) ≈ −126.3 kJ/kg — negative: work done ON the gas (compression).' },
            { title: 'Sanity', desc: 'Compression ⇒ W < 0 by our sign convention (W > 0 out). ✓' },
            { title: 'If asked heat', desc: 'q = Δu + w; need c_v for Δu — energy balance closes it.' },
          ],
          solution: 'w ≈ −126 kJ/kg (work input to compress 1 kg of air).',
        },
        practice: {
          title: 'Two-phase quality',
          prompt: 'Saturated mixture at 200 kPa with h = 2500 kJ/kg. Find quality using h_f = 504.7, h_fg = 2201.6 kJ/kg.',
          hint: 'x = (h − h_f)/h_fg.',
        },
        mistakes: [
          {
            mistake: 'Computing quality for superheated states',
            fix: 'x only exists inside the vapor dome — outside, use the appropriate single-phase table.',
          },
          {
            mistake: 'Using PV = mRT for steam near saturation',
            fix: 'Real-gas effects dominate near the dome — steam tables (or correlations) are required.',
          },
        ],
        exam: {
          question: 'Define quality and state the conditions under which it exists.',
          answer: 'Quality x = m_vapour/m_total for a saturated liquid–vapour mixture; it exists only inside the vapour dome where liquid and vapour coexist in equilibrium. Undefined for subcooled liquid or superheated vapour.',
          source: 'Frequent short-answer question.',
        },
        summary: [
          'Boundary work = ∫P dV; polytropic closed form (P₂V₂−P₁V₁)/(1−n).',
          'Ideal gas: u, h depend on T only; real substances need tables.',
          'Quality x applies only in the two-phase region; use h = h_f + x·h_fg.',
        ],
      }),
      [
        [
          'Boundary work for an isochoric process is:',
          ['PΔV', 'Zero', 'mRT ln r', 'Infinity'],
          1,
          'No volume change, no boundary work.',
        ],
        [
          'Quality x is meaningful when the state is:',
          ['Superheated vapour', 'Subcooled liquid', 'Saturated liquid–vapour mixture', 'Above critical point'],
          2,
          'Only inside the dome.',
        ],
        [
          'For an ideal gas, internal energy depends on:',
          ['P and V only', 'Temperature only', 'Entropy only', 'Quality only'],
          1,
          'Joule\'s law: u = u(T).',
        ],
      ]
    ),
  ],
};
