// Module 4 — Combustion, Mixtures & Psychrometrics
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Combustion, Mixtures & Psychrometrics',
  summary:
    'Air-fuel ratios, stoichiometric/actual combustion analysis, adiabatic flame temperature, and psychrometric properties for HVAC.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'th-4-1',
      1,
      'Combustion & Air-Fuel Analysis',
      'Theoretical vs actual air, excess air, combustion equation balancing, and adiabatic flame temperature reasoning.',
      13,
      nineBlocks({
        objectives: [
          'Balance hydrocarbon combustion equations and find stoichiometric AFR',
          'Interpret excess air and leftover O₂/N₂ in product gas analysis',
          'Reason about adiabatic flame temperature and its engineering limits',
        ],
        hook:
          'A gas turbine that runs lean (excess air) stays cooler and makes fewer NOx; run too lean and it flames out. Every combustor designer lives on the air-fuel ratio line — and that line starts with balancing one combustion equation.',
        concept: `**Stoichiometric combustion (general hydrocarbon CₓHᵧ):**
CₓHᵧ + (x + y/4) O₂ → x CO₂ + (y/2) H₂O

**Fuel-specific anchors:**
- Methane CH₄: CH₄ + 2(O₂ + 3.76 N₂) → CO₂ + 2H₂O + 7.52 N₂
- Propane C₃H₈: C₃H₈ + 5(O₂ + 3.76 N₂) → 3CO₂ + 4H₂O + 18.8 N₂
- Octane C₈H₁₈ (gasoline surrogate): 2C₈H₁₈ + 25(O₂ + 3.76 N₂) → 16CO₂ + 18H₂O + 94 N₂

**Air-fuel ratio:**
- Stoichiometric AFR_stoich = m_air/m_fuel at exactly enough O₂.
- Actual AFR; equivalence ratio φ = (A/F)_actual/(A/F)_stoich. φ > 1 rich, φ < 1 lean.
- Percent theoretical air = 100% × (moles O₂ actual)/(moles O₂ stoich); excess air = that − 100%.

**Rich vs lean products:**
- Lean: leftover O₂ in products, CO₂ and H₂O as calculated, plus extra N₂.
- Stoichiometric: only CO₂, H₂O, N₂ (complete combustion idealization).
- Rich: incomplete — CO, unburned H₂/hydrocarbons appear; less O₂ available than demanded.

**Adiabatic flame temperature (AFT):** temperature if combustion ran with Q = 0 (no heat loss) starting from reactants at 25°C. Higher AFT with:
- Higher initial T (preheat/turbocharging effect)
- Higher calorific value fuel
- Less inert dilution (less excess air/N₂) — pure O₂ flames run hottest
- Dissociation at extreme T lowers the theoretical ceiling (energy goes into breaking CO₂/H₂O)

**Heating values:** HHV includes latent heat of water vaporization in products; LHV excludes it (common in gas-turbine work).`,
        extras: [
          table('Term', ['Definition'], [
            ['Stoichiometric AFR', 'Air/fuel mass ratio at exact O₂ demand'],
            ['φ (equivalence)', 'AFR_actual/AFR_stoich; >1 rich'],
            ['% theoretical air', '100 × O₂_actual/O₂_stoich'],
            ['AFT', 'T if adiabatic complete combustion'],
            ['HHV vs LHV', 'With vs without water condensation latent heat'],
          ]),
          tip(
            'N₂ rides along everywhere',
            'Air is ~21% O₂, 79% N₂ by mole — include 3.76 N₂ per O₂ in every balanced equation or product masses will be wrong.',
          ),
          warn(
            'Rich combustion is not "more power only"',
            'It wastes fuel and emits CO/HC — modern engines target stoichiometric or lean with aftertreatment.',
          ),
        ],
        worked: {
          title: 'Stoichiometric methane AFR',
          problem: 'CH₄ combustion in air. Find mole-based AFR and mass-based AFR_stoich. M_CH₄ ≈ 16, M_air ≈ 29 kg/kmol.',
          steps: [
            { title: 'Balanced equation', desc: 'CH₄ + 2(O₂ + 3.76 N₂) → CO₂ + 2H₂O + 7.52 N₂.' },
            { title: 'Moles of air', desc: 'Per mol fuel: 2 O₂ + 7.52 N₂ = 9.52 mol air.' },
            { title: 'Mole AFR', desc: 'AFR_mol = 9.52/1 = 9.52 mol air per mol CH₄.' },
            { title: 'Mass AFR', desc: 'm_air = 9.52 × 29 ≈ 276; m_fuel = 16 ⇒ AFR_stoich ≈ 276/16 ≈ 17.2 (≈ 17.2 kg air/kg methane).' },
            { title: 'Sanity', desc: 'Matches the known ~17:1 for methane — good memory check for exams.' },
          ],
          solution: 'AFR_stoich ≈ 17.2 kg air per kg CH₄ (9.52 mol basis).',
        },
        practice: {
          title: 'Excess air products',
          prompt: 'Combustion with 150% theoretical air: where does the extra O₂ end up, and what happens to N₂ moles vs stoichiometric?',
          hint: '50% extra O₂ plus proportional extra N₂ dilutes products.',
        },
        mistakes: [
          {
            mistake: 'Forgetting N₂ from air in product calculations',
            fix: 'N₂ is inert but massive — it dominates product mass and lowers flame temperature.',
          },
          {
            mistake: 'Mixing up φ > 1 with lean',
            fix: 'φ > 1 means MORE fuel than stoich (rich); lean is φ < 1 or % theoretical air > 100.',
          },
        ],
        exam: {
          question: 'Define excess air and explain its effect on combustion product composition and flame temperature.',
          answer: 'Excess air = percent oxygen supplied above stoichiometric. It adds leftover O₂ and extra N₂ to products, dilutes the flame, lowers adiabatic flame temperature (good for NOx control and turbine inlet limits) but can reduce combustion efficiency if excessive.',
          source: 'Common short/long question.',
        },
        summary: [
          'Balance CₓHᵧ with (x + y/4) O₂; carry 3.76 N₂ per O₂ for air.',
          'φ and % theoretical air describe rich/lean; rich → CO, lean → leftover O₂.',
          'AFT rises with preheat and fuel heating value, falls with dilution and dissociation.',
        ],
      }),
      [
        [
          'For lean combustion (excess air), products contain:',
          ['Only CO₂ and H₂O', 'Leftover O₂ plus CO₂, H₂O, N₂', 'CO and unburned H₂ only', 'Pure CO₂'],
          1,
          'Extra oxygen remains after reaction.',
        ],
        [
          'Equivalence ratio φ > 1 indicates:',
          ['Lean mixture', 'Stoichiometric', 'Rich mixture', 'Pure oxidizer'],
          2,
          'More fuel than stoichiometric demand.',
        ],
        [
          'Adiabatic flame temperature is highest with:',
          ['Maximum excess air', 'Pure oxygen and preheated reactants', 'Very rich mixture with dissociation', 'Cold reactants and high humidity'],
          1,
          'Less inert dilution + higher initial enthalpy.',
        ],
      ]
    ),
    lesson(
      M4,
      'th-4-2',
      2,
      'Psychrometrics: Moist Air & HVAC',
      'Humidity ratio, relative humidity, dew point, dry- and wet-bulb temperatures, and simple heating/cooling/dehumidification processes on the psychrometric chart.',
      13,
      nineBlocks({
        objectives: [
          'Compute humidity ratio and relative humidity from partial pressures',
          'Identify standard HVAC processes (sensible heating, cooling, dehumidify, humidify) on a psych chart',
          'Apply the moist-air energy balance (ṁ_a·Δh) for coil and room calculations',
        ],
        hook:
          'Every air conditioner is a psychrometric problem in a metal box: know the room\'s humidity ratio, know the coil\'s exit state, and the tonnage follows from one enthalpy difference. Comfort engineering is applied thermodynamics with a chart.',
        concept: `**Moist air = dry air + water vapor (treated as ideal-gas mixture):**
- Total P = P_a (dry air) + P_v (vapor); P_v = φ·P_g(T), where P_g = P_sat(T).
- **Humidity ratio (absolute humidity):** ω = m_v/m_a = 0.622·P_v/(P − P_v) kg vapor/kg dry air.
- **Relative humidity:** φ = P_v/P_g (0–100%) — how "full" the air is vs saturation at that T.
- **Dew point:** temperature at which current P_v becomes P_sat — cooling below it causes condensation.
- **Dry-bulb:** thermometer reading; **wet-bulb:** cooled by evaporation — depression indicates dryness.
- **Humid volume, enthalpy:** h ≈ c_pa·T + ω·(h_g° + c_pv·T) — charts tabulate h and ω.

**Chart processes (slope intuition):**
- Sensible heating: right along constant ω (T up, φ down).
- Sensible cooling: left along constant ω until dew point, then follow saturation + condensation.
- Dehumidification: cool below dew point (coil) — ω and T both drop; may reheat for comfort.
- humidification: add vapor (up on chart).

**Coil/room energy balance (steady):**
ṁ_a(h_out − h_in) = q̇ ( sensible-only approx: ṁ_a c_p ΔT ).
Moisture balance: ṁ_a(ω_out − ω_in) = ṁ_v added/removed.

**Comfort & design:** summer AC ~ 24°C, 50% RH; ASHRAE charts drive coil selection; latent vs sensible split determines if you need a bigger coil or a dehumidifier.`,
        extras: [
          table('Property', ['Definition'], [
            ['ω (humidity ratio)', 'kg vapor / kg dry air'],
            ['φ (relative humidity)', 'P_v/P_g(T)'],
            ['Dew point', 'T where P_v = P_sat'],
            ['Wet-bulb', 'Min T by evaporative cooling'],
            ['Humid volume', 'Volume per kg dry air'],
          ]),
          tip(
            'Dry-air basis keeps balances clean',
            'All ω, ṁ_a bookkeeping is per kg of DRY air — moisture is the passenger, not the base.',
          ),
          warn(
            'RH is temperature-dependent',
            'Same ω at higher T = lower RH — do not treat RH as an absolute moisture measure; use ω for mass balances.',
          ),
        ],
        worked: {
          title: 'Humidity ratio from partial pressure',
          problem: 'At 30°C, P_sat ≈ 4.24 kPa, P = 101.3 kPa, φ = 60%. Find P_v, ω, and dew point.',
          steps: [
            { title: 'Vapor pressure', desc: 'P_v = φ·P_g = 0.60 × 4.24 ≈ 2.55 kPa.' },
            { title: 'Humidity ratio', desc: 'ω = 0.622 × 2.55/(101.3 − 2.55) ≈ 0.622 × 2.55/98.75 ≈ 0.0161 kg/kg_da.' },
            { title: 'Dew point', desc: 'Find T where P_sat(T) = 2.55 kPa — between ~20–22°C (from steam table: ~21.5°C). Cool below this and condensation starts.' },
            { title: 'Comfort read', desc: 'ω ≈ 16 g/kg is a typical summer outdoor value; cooling coil must condense down to ~10 g/kg for comfort.' },
            { title: 'Balance use', desc: 'Room load: ṁ_a·Δh sets coil capacity; ω drop sets dehumidification duty.' },
          ],
          solution: 'P_v ≈ 2.55 kPa, ω ≈ 0.0161, dew point ≈ 21.5°C.',
        },
        practice: {
          title: 'Chart sketch',
          prompt: 'Sketch (describe) the path for: (a) sensible heating, (b) cooling with dehumidification on a summer coil.',
          hint: 'Constant ω right; saturation line then left-down for (b).',
        },
        mistakes: [
          {
            mistake: 'Using relative humidity in mass/energy balances',
            fix: 'Convert to ω (humidity ratio) — balances are per kg dry air with absolute moisture content.',
          },
          {
            mistake: 'Forgetting latent load in AC sizing',
            fix: 'Total coil load = sensible + latent; humid climates are latent-dominated.',
          },
        ],
        exam: {
          question: 'Define humidity ratio and relative humidity, and explain why humidity ratio is used in energy/mass balances.',
          answer: 'Humidity ratio ω = m_v/m_a (kg vapor per kg dry air); relative humidity φ = P_v/P_g(T). Balances use ω because dry air mass is conserved through coils/processes and moisture transfer is proportional to absolute, not relative, content.',
          source: 'Core psychrometrics question.',
        },
        summary: [
          'Moist air as ideal-gas mixture; ω and φ from P_v and P_g(T).',
          'Dew point = saturation of current vapor pressure; crossing it condenses water.',
          'HVAC processes read as paths on the psych chart; balances use dry-air basis.',
        ],
      }),
      [
        [
          'Humidity ratio ω is defined as:',
          ['P_v/P_g', 'Mass of vapor per mass of dry air', 'Dew point temperature', 'Mass of vapor per total mass'],
          1,
          'Dry-air denominator.',
        ],
        [
          'Cooling air below its dew point causes:',
          ['No change', 'Condensation (dehumidification)', 'Humidification only', 'Sensible heating'],
          1,
          'Vapor crosses saturation and condenses.',
        ],
        [
          'In psychrometric energy balances, the base mass is:',
          ['Water vapor', 'Dry air', 'Total moist air', 'Ambient pressure'],
          1,
          'ṁ_a·Δh with dry-air flow.',
        ],
      ]
    ),
  ],
};
