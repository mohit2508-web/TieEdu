// Module 2 — Entropy, Availability & Gas Cycles
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Entropy, Availability & Gas Cycles',
  summary:
    'Entropy as property and direction-finder, T–s analysis, exergy/availability and irreversibility, Otto/Diesel/Dual air-standard cycles.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'th-2-1',
      1,
      'Entropy & Availability (Exergy)',
      'Entropy change calculations for ideal gases and pure substances, isentropic efficiencies, availability and second-law efficiency.',
      13,
      nineBlocks({
        objectives: [
          'Compute ΔS for ideal gases and across heat-transfer processes',
          'Use isentropic efficiencies of turbines and compressors correctly',
          'Calculate availability, irreversibility and second-law efficiency',
        ],
        hook:
          'Two turbines produce the same shaft work; one destroys more exergy than the other. First-law efficiency cannot tell them apart — second-law (availability) analysis can, and that is why power-plant audits use it.',
        concept: `**Entropy as a property:**
- Clausius: dS = δQ_rev/T; inequality: ΔS ≥ ∫δQ/T (equality reversible).
- Isolated system: ΔS ≥ 0 — entropy is the direction clock.
- ΔS for heat transfer at constant T: ΔS = Q/T.
- Ideal gas: Δs = c_p ln(T₂/T₁) − R ln(P₂/P₁) = c_v ln(T₂/T₁) + R ln(v₂/v₁).
- Two-phase: Δs = s_f + x·s_fg at the state; across a constant-T phase change, ΔS = Q/T_sat.

**Isentropic efficiency (steady-flow devices):**
- Turbine: η_turb = actual w / isentropic w = (h₁ − h₂)/(h₁ − h₂s)
- Compressor/pump: η_comp = isentropic w / actual w = (h₂s − h₁)/(h₂ − h₁) — inverted so η ≤ 1.
- Nozzle: η_nozzle = actual Δke / isentropic Δke.

**Availability (exergy) — useful work potential:**
- Closed system: Φ = (U − U₀) + P₀(V − V₀) − T₀(S − S₀)
- Steady-flow stream: ψ = (H − H₀) − T₀(S − S₀)
- Irreversibility: I = T₀·S_gen = ΔΨ_total (lost work potential)
- Second-law efficiency: η_II = (actual work)/(maximum possible work) = W/W_rev or exergy recovered/exergy supplied.

**Where exergy dies:** throttling (ΔH ≈ 0 but S_gen > 0), finite-ΔT heat transfer, friction, unrestrained expansion.`,
        extras: [
          table('Device', ['η definition (≤ 1)'], [
            ['Turbine', '(h₁ − h₂)/(h₁ − h₂s)'],
            ['Compressor/pump', '(h₂s − h₁)/(h₂ − h₁)'],
            ['Nozzle', 'Δke_actual/Δke_isen'],
            ['Heat exchanger (LMTD-based)', 'actual Q/Q_max'],
          ]),
          tip(
            'Second law always wins the tie-break',
            'Equal First-law outputs? Compare S_gen or exergy destruction — lower destruction = better design.',
          ),
          warn(
            'Compressor efficiency is inverted on purpose',
            'For "work-consuming" devices η = isen/actual so it stays ≤ 1; using the turbine formula gives η ≥ 1.',
          ),
        ],
        worked: {
          title: 'Turbine isentropic efficiency',
          problem: 'Steam turbine: inlet h₁ = 3200 kJ/kg, s₁ = 6.9 kJ/kg·K; condenser P₂ = 10 kPa with h₂s = 2100 kJ/kg; actual outlet h₂ = 2300 kJ/kg. Find η_turb.',
          steps: [
            { title: 'Ideal work', desc: 'w_s = h₁ − h₂s = 3200 − 2100 = 1100 kJ/kg.' },
            { title: 'Actual work', desc: 'w_a = h₁ − h₂ = 3200 − 2300 = 900 kJ/kg.' },
            { title: 'Efficiency', desc: 'η_turb = w_a/w_s = 900/1100 ≈ 0.818 ≈ 81.8%.' },
            { title: 'Entropy check', desc: 's₂ > s₂s (= s₁) since s₁ = 6.9 at isentropic exit — irreversibility raised outlet entropy and enthalpy.' },
            { title: 'Exergy read', desc: 'Lost work = T₀·S_gen; part of the 200 kJ/kg gap is that destruction.' },
          ],
          solution: 'η_turb ≈ 82% — the missing 18% of ideal work became irreversibility (plus any kinetic effects neglected).',
        },
        practice: {
          title: 'Throttling exergy',
          prompt: 'A valve drops pressure with h_in = h_out. Where did the exergy go, and what is S_gen sign?',
          hint: 'Throttling is isenthalpic, never isentropic for real gases/liquids with ΔP.',
        },
        mistakes: [
          {
            mistake: 'Using the turbine efficiency formula for a compressor',
            fix: 'Flip the ratio for work-input devices so η stays ≤ 1.',
          },
          {
            mistake: 'Calling high First-law efficiency "good" without exergy context',
            fix: 'A 90% turbine can still destroy huge exergy if the stream had high availability — check η_II.',
          },
        ],
        exam: {
          question: 'Define second-law (exergetic) efficiency and contrast it with First-law efficiency for a heat engine.',
          answer: 'η_II = W_actual/W_rev_max (or exergy recovered/supplied). First-law η = W/Q_H ignores the quality of energy and the environment state; η_II accounts for how much of the available work potential was actually captured.',
          source: 'Common conceptual question.',
        },
        summary: [
          'ΔS ≥ ∮δQ/T; isentropic process is the reversible adiabatic reference.',
          'Turbine η = actual/isen; compressor η = isen/actual (both ≤ 1).',
          'Availability Ψ/Helmholtz-Gibbs forms; irreversibility I = T₀S_gen.',
        ],
      }),
      [
        [
          'For a compressor, isentropic efficiency is:',
          ['(h₁−h₂)/(h₁−h₂s)', '(h₂s−h₁)/(h₂−h₁)', '(h₂−h₁)/(h₂s−h₁)', 'Δke ratio'],
          1,
          'Inverted so η ≤ 1 for work-consuming devices.',
        ],
        [
          'Irreversibility equals:',
          ['T₀·S_gen', 'T·ΔS only', 'Q/T', 'W_lost without T₀'],
          0,
          'Gouy–Stodola theorem.',
        ],
        [
          'Throttling a real fluid through a valve results in:',
          ['ΔS < 0', 'ΔS = 0', 'ΔS > 0', 'Undefined ΔS'],
          2,
          'Irreversible pressure drop increases entropy.',
        ],
      ]
    ),
    lesson(
      M2,
      'th-2-2',
      2,
      'Air-Standard Cycles: Otto, Diesel & Dual',
      'Mean effective pressure, compression ratio effects, efficiency formulas for Otto/Diesel/Dual, and how real IC engines deviate.',
      13,
      nineBlocks({
        objectives: [
          'Derive and apply Otto and Diesel efficiency formulas from compression/expansion ratios',
          'Compute MEP and compare cycles at equal displacement',
          'Explain Dual cycle as the realistic spark/compression-ignition blend',
        ],
        hook:
          'Raise the compression ratio of a petrol engine and efficiency climbs — until knock destroys the pistons. Diesel engines run higher ratios because they compress only air. The Otto/Diesel formulas are the mathematical version of that trade-off.',
        concept: `**Air-standard assumptions:** fixed air mass, closed cycle, combustion replaced by heat addition, exhaust by heat rejection, constant properties (often cold-air-standard with constant c_p, c_v, k).

**Otto cycle (spark ignition):** 1-2 isentropic compression (r = V₁/V₂), 2-3 constant-V heat addition, 3-4 isentropic expansion, 4-1 constant-V heat rejection.
η_Otto = 1 − 1/r^(k−1)

**Diesel cycle (compression ignition):** 1-2 isentropic compression, 2-3 constant-P heat addition (cutoff ratio r_c = V₃/V₂), 3-4 isentropic expansion, 4-1 constant-V rejection.
η_Diesel = 1 − (1/r^(k−1)) · (r_c^k − 1)/(k(r_c − 1))

**Dual (mixed) cycle:** constant-V then constant-P heat addition — closer to modern high-speed CI engines; efficiency between Otto and Diesel for same r.

**Mean effective pressure:** MEP = W_net / V_displaced (V₁ − V₂) — the "average push" on the piston; good for comparing engines of different size.

**Comparisons (same r, same heat addition):**
- Otto has the highest efficiency of the three (heat added at highest average T).
- Diesel at same r is slightly lower but real CI engines run higher r (no knock limit), so real Diesel often beats real Otto.
- Higher k (cooler gases) raises all efficiencies.

**Real deviations:** finite-time heat transfer, friction (FMEP), heat loss, incomplete combustion, blowdown losses — real η is well below air-standard.`,
        extras: [
          table('Cycle', ['Heat addition', 'Efficiency'], [
            ['Otto', 'Constant volume', '1 − 1/r^(k−1)'],
            ['Diesel', 'Constant pressure', '1 − (1/r^(k−1))(r_c^k−1)/(k(r_c−1))'],
            ['Dual', 'V then P', 'Between Otto and Diesel at same r'],
          ]),
          tip(
            'Same r, compare instantly',
            'Otto ≥ Dual ≥ Diesel at identical compression ratio; remember Diesel recovers in practice via higher allowable r.',
          ),
          warn(
            'Do not plug r_c into Otto',
            'Only Diesel/Dual use cutoff ratio — Otto\'s efficiency depends on r alone (air-standard).',
          ),
        ],
        worked: {
          title: 'Otto efficiency and MEP',
          problem: 'Petrol engine, r = 9, k = 1.4. Find η_Otto. If q_in = 800 kJ/kg, find w_net and MEP with v₁ = 0.8 m³/kg.',
          steps: [
            { title: 'Efficiency', desc: 'η = 1 − 1/9^0.4 = 1 − 1/9^0.4. 9^0.4 ≈ 2.408 ⇒ η ≈ 1 − 0.415 ≈ 0.585 (58.5%).' },
            { title: 'Net work', desc: 'w_net = η·q_in = 0.585 × 800 ≈ 468 kJ/kg.' },
            { title: 'Displacement', desc: 'v₂ = v₁/r = 0.8/9 ≈ 0.0889; Δv = 0.8 − 0.0889 ≈ 0.711 m³/kg.' },
            { title: 'MEP', desc: 'MEP = w_net/Δv = 468/0.711 ≈ 658 kPa (≈ 6.6 bar) — a realistic petrol MEP order of magnitude.' },
            { title: 'Reality check', desc: 'Real engines land lower (30–40% net) due to friction, finite-time losses, real gas effects.' },
          ],
          solution: 'η ≈ 58.5%, w_net ≈ 468 kJ/kg, MEP ≈ 6.6 bar.',
        },
        practice: {
          title: 'Diesel cutoff effect',
          prompt: 'At fixed r and k, what happens to η_Diesel as r_c → 1, and what does that limit become?',
          hint: 'r_c → 1 collapses heat addition to a point — limit approaches Otto-like expression at constant P?',
        },
        mistakes: [
          {
            mistake: 'Using compression ratio interchangeably with cutoff ratio',
            fix: 'r = V_max/V_min over the full stroke; r_c = V₃/V₂ only spans the heat-addition leg.',
          },
          {
            mistake: 'Quoting air-standard efficiencies as achievable engine efficiency',
            fix: 'They are upper bounds on the idealized cycle — real engines subtract friction, heat loss, and finite-time effects.',
          },
        ],
        exam: {
          question: 'Show that for the same compression ratio the Otto cycle is more efficient than the Diesel cycle, and explain why real Diesels still win at the pump.',
          answer: 'At fixed r and heat input, Otto adds heat at the highest average temperature, maximizing η per Carnot-like reasoning; Diesel\'s constant-P leg spreads addition to lower T. In practice CI engines tolerate far higher r (no knock), which more than offsets the per-cycle penalty.',
          source: 'Classic derivation + discussion question.',
        },
        summary: [
          'Otto η = 1 − 1/r^(k−1); Diesel adds cutoff-ratio correction ≤ Otto at same r.',
          'MEP normalizes work output across engine sizes.',
          'Dual blends V+P heat addition; real engines fall short of all air-standard limits.',
        ],
      }),
      [
        [
          'Otto-cycle efficiency depends primarily on:',
          ['Cutoff ratio', 'Compression ratio r and k', 'Mean effective pressure', 'Fuel type only'],
          1,
          'η = 1 − 1/r^(k−1).',
        ],
        [
          'At the same compression ratio, which cycle is most efficient (air-standard)?',
          ['Diesel', 'Otto', 'Dual', 'All equal'],
          1,
          'Constant-V addition at highest T.',
        ],
        [
          'MEP is defined as:',
          ['W_net / heat input', 'W_net / displacement volume', 'P_max/P_min', 'Q_rejected / T_low'],
          1,
          'Average effective pressure over the stroke.',
        ],
      ]
    ),
  ],
};
