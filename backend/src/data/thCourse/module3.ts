// Module 3 — Vapour Power & Refrigeration Cycles
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Vapour Power & Refrigeration Cycles',
  summary:
    'Rankine cycle with reheat and regeneration, COP of refrigeration/heat pumps, and the vapour-compression cycle with superheat and subcooling.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'th-3-1',
      1,
      'Rankine Cycle & Improvements',
      'The steam power cycle: pump, boiler, turbine, condenser; why reheat and regeneration raise efficiency; dryness fraction limits.',
      13,
      nineBlocks({
        objectives: [
          'Analyze the ideal Rankine cycle with steam-table enthalpies',
          'Explain reheat and regeneration and compute cycle efficiency changes',
          'Relate turbine outlet quality to blade erosion and design fixes',
        ],
        hook:
          'Every thermal power plant on Earth — coal, nuclear, solar-thermal — runs a Rankine-family cycle. The boiler makes steam, the turbine extracts work, the condenser dumps heat, the pump sends water back. Understanding its four states is understanding the grid.',
        concept: `**Ideal Rankine cycle states:**
1 → 2: isentropic pump (subcooled liquid compressed)
2 → 3: constant-P heat addition in boiler (to superheated vapour)
3 → 4: isentropic turbine (work out; may end in wet region)
4 → 1: constant-P/constant-T heat rejection in condenser

**Energy balances (per kg):**
- w_turb = h₃ − h₄
- w_pump = v₁(P₂ − P₁) ≈ h₂ − h₁ (incompressible liquid approximation)
- q_in = h₃ − h₂
- q_out = h₄ − h₁
- η_Rankine = w_net/q_in = 1 − q_out/q_in

**Why Rankine beats a gas cycle at the same T limits:** phase change lets large q transfer nearly isothermally in the boiler/condenser, better matching the Carnot rectangle on T–s.

**Reheat:** expand in turbine to intermediate P, reheat to T_max, expand again. Raises mean temperature of heat addition AND outlet quality (less moisture erosion).

**Regeneration (feedwater heaters):** bleed steam at intermediate pressure to preheat feedwater before the boiler — raises average T of heat addition (closer to Carnot) at the cost of some turbine work. Open vs closed FWHs.

**Efficiency levers:** higher boiler P and T (until material limits), lower condenser P (better vacuum), reheat stages, more regeneration stages (with diminishing returns).`,
        extras: [
          table('Component', ['Process', 'Key quantity'], [
            ['Pump', 'Isentropic liquid compression', 'w_p ≈ vΔP'],
            ['Boiler', 'Constant-P evaporation + superheat', 'q_in = h₃ − h₂'],
            ['Turbine', 'Isentropic expansion', 'w_t = h₃ − h₄'],
            ['Condenser', 'Constant-P/T condensation', 'q_out = h₄ − h₁'],
          ]),
          tip(
            'Pump work is tiny — but not zero',
            'Liquid v is small so w_p is often < 2% of w_turb, yet skipping it breaks the energy balance.',
          ),
          warn(
            'Outlet quality below ~0.88 hurts blades',
            'Wet droplets erode turbine blades — that is why reheat exists in real plants.',
          ),
        ],
        worked: {
          title: 'Ideal Rankine efficiency',
          problem: 'Boiler 3 MPa, 350°C; condenser 10 kPa. Using h values: h₃ = 3116 kJ/kg, s₃ = 6.745; at 10 kPa, s_f = 0.649, s_g = 8.150, h_f = 192, h_fg = 2392. Find η. (Ignore pump work for the first cut.)',
          steps: [
            { title: 'Isentropic turbine exit', desc: 's₄ = s₃ = 6.745. x₄ = (6.745 − 0.649)/(8.150 − 0.649) ≈ 0.813.' },
            { title: 'h₄', desc: 'h₄ = h_f + x₄·h_fg = 192 + 0.813×2392 ≈ 2137 kJ/kg.' },
            { title: 'Work and heat', desc: 'w_t = 3116 − 2137 = 979; q_in ≈ h₃ − h₂ ≈ 3116 − 192 = 2924 (pump neglected).' },
            { title: 'Efficiency', desc: 'η ≈ 979/2924 ≈ 0.335 (33.5%) — typical ideal Rankine scale.' },
            { title: 'Quality flag', desc: 'x₄ ≈ 0.81 — below the comfort zone; real design would reheat.' },
          ],
          solution: 'η ≈ 33–34% ideal; outlet moisture ~19% motivates reheat.',
        },
        practice: {
          title: 'Reheat reasoning',
          prompt: 'Explain two distinct benefits of reheat (one thermodynamic, one mechanical/reliability).',
          hint: 'Think mean addition temperature AND droplet damage.',
        },
        mistakes: [
          {
            mistake: 'Treating pump work as zero in exacting problems',
            fix: 'Even if small, include w_p = v(P_boiler − P_cond) for complete bookkeeping and correct q_in.',
          },
            {
            mistake: 'Confusing reheat with regeneration',
            fix: 'Reheat = re-expand after reheating; regeneration = bleed to preheat feedwater. Different mechanisms.',
          },
        ],
        exam: {
          question: 'How do reheat and regeneration improve the Rankine cycle? State the primary mechanism of each.',
          answer: 'Reheat raises the average temperature of heat addition and increases turbine outlet quality (reduces moisture). Regeneration preheats feedwater with bled steam, raising the mean heat-addition temperature closer to Carnot, improving efficiency at some turbine-work cost.',
          source: 'Evergreen 6–8 mark question.',
        },
        summary: [
          'Rankine four-state energy balance: w_t, w_p, q_in, q_out from enthalpies.',
          'η = 1 − q_out/q_in; limited by mean addition/rejection temperatures.',
          'Reheat fixes moisture + mean T; regeneration lifts mean T via bleed preheat.',
        ],
      }),
      [
        [
          'The Rankine cycle is preferred over a gas cycle at the same temperature limits mainly because:',
          ['Gas turbines are weaker', 'Phase change allows large isothermal heat transfer', 'Pumps cost less than compressors', 'Condensers are smaller'],
          1,
          'Better T-s "rectangle" match.',
        ],
        [
          'Primary mechanical reason for reheat is:',
          ['Higher boiler pressure only', 'Increased outlet quality (less blade erosion)', 'Simpler condenser', 'Lower pump work'],
          1,
          'Wetness damages blades.',
        ],
        [
          'Regeneration improves efficiency by:',
          ['Increasing turbine inlet T only', 'Raising mean temperature of heat addition via feedwater preheat', 'Decreasing condenser pressure', 'Adding more fuel'],
          1,
          'Bled steam preheats feedwater.',
        ],
      ]
    ),
    lesson(
      M3,
      'th-3-2',
      2,
      'Vapour-Compression Refrigeration & COP',
      'COP definitions, ideal and practical vapour-compression cycle, effect of superheat/subcooling, and refrigerant selection trade-offs.',
      13,
      nineBlocks({
        objectives: [
          'Compute COP_ref and COP_HP from cycle enthalpies and relate them',
          'Analyze a practical vapour-compression cycle with superheat and subcooling',
          'Explain why throttling dominates irreversibility in refrigeration',
        ],
        hook:
          'Your fridge moves heat from 4°C to a 30°C kitchen every second it runs — "downhill" in temperature is exactly what the Second Law forbids without work. COP tells you how cheaply you buy that violation of intuition.',
        concept: `**COP definitions:**
- Refrigeration: COP_R = desired effect (Q_L) / work in = q_L/w_net
- Heat pump: COP_HP = Q_H/w_net = COP_R + 1 (same cycle, different accounting)
- Carnot bounds: COP_R,C = T_L/(T_H − T_L); COP_HP,C = T_H/(T_H − T_L) — use Kelvin.

**Ideal vapour-compression (4 devices):**
1 → 2: isentropic compression of saturated vapour (to superheated)
2 → 3: constant-P condensation to saturated liquid
3 → 4: isenthalpic throttling to low P (two-phase)
4 → 1: constant-P evaporation (absorb q_L)

**Practical refinements:**
- **Superheat at compressor inlet:** ensures dry compression (protects compressor); slight q_L increase.
- **Subcooling before throttle:** lowers h₃, increases q_L per kg, raises COP.
- **Throttling loss:** the big irreversibility — replacing the expansion valve with an expander/turbine recovers work and pre-cools the liquid (used in large systems).

**Why not a heat engine running backward "reversed Carnot"?** Real compressors cannot handle wet vapor (slugging) and finite-rate heat transfer forbids pure Carnot — hence the standard four-device layout.

**Refrigerants:** ammonia (high latent heat, toxic), R-134a (HFC, mobile/AC), CO₂ (transcritical, low-GWP trend). Ozone (CFC/HCFC) and GWP (HFC) regulations shape the modern list — HFOs and blends are the replacement wave.`,
        extras: [
          table('Term', ['Meaning'], [
            ['COP_R', 'q_L/w_net (cooling goal)'],
            ['COP_HP', 'q_H/w_net = COP_R + 1'],
            ['Carnot COP bound', 'T_L/(T_H−T_L) with Kelvin temps'],
            ['Superheat', 'Vapor heated past sat. before/after compression'],
            ['Subcooling', 'Liquid cooled below sat. before throttle'],
          ]),
          tip(
            'Add 1, do not memorize twice',
            'If you have COP_R, COP_HP is just +1 for the same cycle — verify from enthalpies when in doubt.',
          ),
          warn(
            'Kelvin in Carnot COP',
            'Using Celsius in T_L/(T_H−T_L) gives nonsense — always convert to absolute temperature.',
          ),
        ],
        worked: {
          title: 'Vapor-compression COP',
          problem: 'Refrigerant: h₁ = 400 (evap exit, sat vap), h₂ = 430 (compressor exit), h₃ = 250 (cond exit, sat liq), h₄ = h₃ after throttle. Find COP_R and COP_HP.',
          steps: [
            { title: 'Cycle energies', desc: 'q_L = h₁ − h₄ = 400 − 250 = 150 kJ/kg; q_H = h₂ − h₃ = 430 − 250 = 180; w = h₂ − h₁ = 30.' },
            { title: 'First-law check', desc: 'q_L + w = 150 + 30 = 180 = q_H ✓ (closed accounting).' },
            { title: 'COP_R', desc: 'COP_R = 150/30 = 5.0 — a strong domestic/commercial figure.' },
            { title: 'COP_HP', desc: 'COP_HP = 180/30 = 6.0 = COP_R + 1 ✓.' },
            { title: 'Takeaway', desc: 'Moving 150 units of heat costs only 30 units of work — heat pumps "create" useful heat from the environment at leveraged cost.' },
          ],
          solution: 'COP_R = 5, COP_HP = 6.',
        },
        practice: {
          title: 'Subcooling gain',
          prompt: 'Explain why 5 K of liquid subcooling before the throttle increases q_L per kg, using the h–T diagram mentally.',
          hint: 'Throttle is isenthalpic from a lower h₃.',
        },
        mistakes: [
          {
            mistake: 'Using Celsius in Carnot COP',
            fix: 'Convert to Kelvin — otherwise COP bounds are meaningless.',
          },
          {
            mistake: 'Calling COP "efficiency" with a percentage mindset',
            fix: 'COP routinely exceeds 1 (even 5–6) because it is a ratio of heat moved to work, not heat-to-heat.',
          },
        ],
        exam: {
          question: 'Derive the relationship COP_HP = COP_R + 1 for a vapour-compression system and comment on typical COP magnitudes.',
          answer: 'q_H = q_L + w by energy balance, so COP_HP = q_H/w = (q_L + w)/w = COP_R + 1. Typical COP_R ≈ 2–6 for practical systems — far above 1 because the environment supplies most of the moved heat.',
          source: 'Standard derivation + discussion.',
        },
        summary: [
          'COP_R = q_L/w; COP_HP = COP_R + 1; Carnot bounds need Kelvin.',
          'Four-device vapour-compression; throttling is the dominant irreversibility.',
          'Superheat protects compressors; subcooling boosts q_L and COP.',
        ],
      }),
      [
        [
          'COP_HP for a cycle with COP_R = 4 is:',
          ['4', '5', '0.25', '3'],
          1,
          'COP_HP = COP_R + 1.',
        ],
        [
          'In the vapour-compression cycle, the throttling process is:',
          ['Isentropic', 'Isenthalpic (irreversible)', 'Isobaric heating', 'Isothermal compression'],
          1,
          'Valve/expansion device: h constant, S increases.',
        ],
        [
          'Carnot COP calculations require temperatures in:',
          ['Celsius', 'Kelvin', 'Fahrenheit', 'Rankine only'],
          1,
          'Absolute scale for ratios.',
        ],
      ]
    ),
  ],
};
