// Thermodynamics — course assembly.
// Phase 4 Bucket B branch core (ME interview + university exam).
import type { Course, ExamQuestion } from '../db';
import { module1 } from './module1';
import { module2 } from './module2';
import { module3 } from './module3';
import { module4 } from './module4';
import { COURSE_ID } from './helpers';

const examBank: ExamQuestion[] = [
  {
    id: 'th-ex-1',
    prompt: 'The state postulate for a simple compressible system states that the state is fixed by:',
    options: [
      'Any two properties',
      'Two independent intensive properties',
      'One extensive property only',
      'Pressure and volume always',
    ],
    correct_index: 1,
    explanation: 'Two independent intensive properties fix the thermodynamic state.',
    difficulty: 'easy',
    topic: 'Foundations',
  },
  {
    id: 'th-ex-2',
    prompt: '∮δQ/T < 0 for a cycle indicates:',
    options: [
      'Impossible cycle',
      'Reversible cycle',
      'Possible irreversible cycle',
      'Isolated system',
    ],
    correct_index: 2,
    explanation: 'Strict inequality in Clausius means possible but irreversible; equality = reversible; > 0 = impossible.',
    difficulty: 'easy',
    topic: 'Foundations',
  },
  {
    id: 'th-ex-3',
    prompt: 'The Kelvin–Planck statement of the Second Law:',
    options: [
      'Heat flows hot to cold spontaneously',
      'No cycle converts heat entirely to work with a single reservoir',
      'Absolute zero is unreachable',
      'Entropy of an ideal gas depends on T only',
    ],
    correct_index: 1,
    explanation: 'Rejects 100%-efficient single-reservoir heat engines.',
    difficulty: 'easy',
    topic: 'Foundations',
  },
  {
    id: 'th-ex-4',
    prompt: 'Which quantity is a path function?',
    options: ['Internal energy', 'Enthalpy', 'Heat transfer', 'Entropy'],
    correct_index: 2,
    explanation: 'Q and W are path functions; U, H, S are state functions.',
    difficulty: 'easy',
    topic: 'Foundations',
  },
  {
    id: 'th-ex-5',
    prompt: 'Boundary work for an isochoric (constant volume) process in a closed system is:',
    options: ['PΔV', 'Zero', 'mRT ln r', 'Maximum possible'],
    correct_index: 1,
    explanation: 'No displacement ⇒ no boundary work.',
    difficulty: 'easy',
    topic: 'Work and heat',
  },
  {
    id: 'th-ex-6',
    prompt: 'Polytropic boundary work (n ≠ 1) for an ideal gas is:',
    options: [
      '(P₂V₂ − P₁V₁)/(1 − n)',
      'P(V₂ − V₁)',
      'mRT(V₂/V₁)',
      '(P₁ + P₂)(V₂ − V₁)/2',
    ],
    correct_index: 0,
    explanation: 'Standard polytropic closed-form result.',
    difficulty: 'medium',
    topic: 'Work and heat',
  },
  {
    id: 'th-ex-7',
    prompt: 'Quality x of a saturated mixture:',
    options: [
      'Is defined in superheated region',
      'Equals m_vapour/m_total and exists only inside the dome',
      'Is always 0.5',
      'Relates pressure to critical pressure',
    ],
    correct_index: 1,
    explanation: 'Quality only exists for two-phase states.',
    difficulty: 'easy',
    topic: 'Properties',
  },
  {
    id: 'th-ex-8',
    prompt: 'For an ideal gas, internal energy u depends on:',
    options: ['P and V', 'Temperature only', 'Entropy and P', 'Quality'],
    correct_index: 1,
    explanation: "Joule's law for ideal gases: u = u(T).",
    difficulty: 'easy',
    topic: 'Properties',
  },
  {
    id: 'th-ex-9',
    prompt: 'Isentropic efficiency of a turbine is defined as:',
    options: [
      '(h₂s − h₁)/(h₂ − h₁)',
      '(h₁ − h₂)/(h₁ − h₂s)',
      '(h₂ − h₁)/(h₂s − h₁)',
      'q_in/q_out',
    ],
    correct_index: 1,
    explanation: 'Actual work over isentropic work.',
    difficulty: 'medium',
    topic: 'Entropy',
  },
  {
    id: 'th-ex-10',
    prompt: 'Isentropic efficiency of a compressor is:',
    options: [
      'Actual/isentropic (can exceed 1)',
      'Isentropic/actual so it stays ≤ 1',
      'Always 50%',
      'Defined via nozzle Δke',
    ],
    correct_index: 1,
    explanation: 'Inverted for work-consuming devices to keep η ≤ 1.',
    difficulty: 'medium',
    topic: 'Entropy',
  },
  {
    id: 'th-ex-11',
    prompt: 'Irreversibility (lost work potential) is given by:',
    options: ['T₀·S_gen', 'T·ΔS only', 'Q/T', 'ΔU − W'],
    correct_index: 0,
    explanation: 'Gouy–Stodola theorem: I = T₀S_gen.',
    difficulty: 'medium',
    topic: 'Availability',
  },
  {
    id: 'th-ex-12',
    prompt: 'Throttling of a real fluid through a valve results in:',
    options: ['ΔS < 0', 'ΔS = 0', 'ΔS > 0', 'Undefined ΔS'],
    correct_index: 2,
    explanation: 'Irreversible process — entropy increases.',
    difficulty: 'easy',
    topic: 'Availability',
  },
  {
    id: 'th-ex-13',
    prompt: 'Second-law efficiency compares:',
    options: [
      'Heat in vs heat out only',
      'Actual performance to the reversible maximum',
      'Fuel cost to output',
      'Temperatures only',
    ],
    correct_index: 1,
    explanation: 'Exergy recovered / exergy supplied or W_actual/W_rev.',
    difficulty: 'medium',
    topic: 'Availability',
  },
  {
    id: 'th-ex-14',
    prompt: 'Otto-cycle efficiency (air-standard) equals:',
    options: [
      '1 − 1/r^(k−1)',
      '1 − (r_c^k−1)/(k(r_c−1)) · 1/r^(k−1)',
      'r^(k−1)',
      '1 − r/k',
    ],
    correct_index: 0,
    explanation: 'Depends only on compression ratio r and k.',
    difficulty: 'easy',
    topic: 'Gas cycles',
  },
  {
    id: 'th-ex-15',
    prompt: 'At the same compression ratio, which cycle has the highest air-standard efficiency?',
    options: ['Diesel', 'Otto', 'Dual', 'All equal'],
    correct_index: 1,
    explanation: 'Constant-V heat addition at highest average temperature.',
    difficulty: 'medium',
    topic: 'Gas cycles',
  },
  {
    id: 'th-ex-16',
    prompt: 'MEP (mean effective pressure) is:',
    options: [
      'Maximum cylinder pressure',
      'W_net / displacement volume',
      'P_max/P_min',
      'Heat input per cycle',
    ],
    correct_index: 1,
    explanation: 'Average net work per unit stroke volume — size-independent metric.',
    difficulty: 'easy',
    topic: 'Gas cycles',
  },
  {
    id: 'th-ex-17',
    prompt: 'In a Diesel cycle, the cutoff ratio r_c is:',
    options: [
      'V₁/V₂',
      'V₃/V₂ (end of constant-P heat addition over start)',
      'P₂/P₁',
      'T₃/T₁',
    ],
    correct_index: 1,
    explanation: 'Span of the constant-pressure heat-addition leg.',
    difficulty: 'medium',
    topic: 'Gas cycles',
  },
  {
    id: 'th-ex-18',
    prompt: 'Rankine cycle pump work (liquid approximation) is approximately:',
    options: [
      'v₁(P₂ − P₁)',
      'h₃ − h₂',
      'h₄ − h₁',
      'Zero always',
    ],
    correct_index: 0,
    explanation: 'Incompressible liquid: w_p ≈ vΔP, usually small.',
    difficulty: 'easy',
    topic: 'Vapour power',
  },
  {
    id: 'th-ex-19',
    prompt: 'Primary thermodynamic benefit of reheat in Rankine:',
    options: [
      'Lowers boiler pressure',
      'Raises mean temperature of heat addition and outlet quality',
      'Eliminates the condenser',
      'Reduces pump work to zero',
    ],
    correct_index: 1,
    explanation: 'Also reduces moisture erosion at the blade tips.',
    difficulty: 'medium',
    topic: 'Vapour power',
  },
  {
    id: 'th-ex-20',
    prompt: 'Regeneration in a Rankine cycle improves efficiency by:',
    options: [
      'Adding more fuel',
      'Preheating feedwater with bled steam (higher mean addition T)',
      'Lowering condenser pressure only',
      'Superheating twice',
    ],
    correct_index: 1,
    explanation: 'Feedwater heaters raise average T of heat addition.',
    difficulty: 'medium',
    topic: 'Vapour power',
  },
  {
    id: 'th-ex-21',
    prompt: 'Low turbine outlet quality in Rankine causes:',
    options: [
      'Higher efficiency',
      'Blade erosion from wet droplets',
      'Pump cavitation only',
      'Boiler scaling',
    ],
    correct_index: 1,
    explanation: 'Motivates reheat stages.',
    difficulty: 'easy',
    topic: 'Vapour power',
  },
  {
    id: 'th-ex-22',
    prompt: 'COP_HP for a vapour-compression cycle with COP_R = 4:',
    options: ['4', '5', '0.25', '3'],
    correct_index: 1,
    explanation: 'COP_HP = COP_R + 1.',
    difficulty: 'easy',
    topic: 'Refrigeration',
  },
  {
    id: 'th-ex-23',
    prompt: 'The throttling process in vapour-compression refrigeration is:',
    options: ['Isentropic', 'Isenthalpic (irreversible)', 'Isobaric heating', 'Isothermal'],
    correct_index: 1,
    explanation: 'Expansion valve: h constant, entropy rises.',
    difficulty: 'easy',
    topic: 'Refrigeration',
  },
  {
    id: 'th-ex-24',
    prompt: 'Carnot COP values must use temperatures in:',
    options: ['Celsius', 'Kelvin', 'Fahrenheit', 'Any scale if consistent'],
    correct_index: 1,
    explanation: 'Absolute scale required for ratios.',
    difficulty: 'easy',
    topic: 'Refrigeration',
  },
  {
    id: 'th-ex-25',
    prompt: 'Liquid subcooling before the throttle in a refrigeration cycle:',
    options: [
      'Decreases COP',
      'Increases q_L per kg and COP',
      'Has no effect',
      'Wets the compressor',
    ],
    correct_index: 1,
    explanation: 'Lower h₃ ⇒ more refrigerating effect per kg.',
    difficulty: 'medium',
    topic: 'Refrigeration',
  },
  {
    id: 'th-ex-26',
    prompt: 'Equivalence ratio φ > 1 means:',
    options: ['Lean', 'Stoichiometric', 'Rich', 'Pure oxidizer'],
    correct_index: 2,
    explanation: 'More fuel than stoichiometric air demand.',
    difficulty: 'easy',
    topic: 'Combustion',
  },
  {
    id: 'th-ex-27',
    prompt: 'Excess air in combustion primarily results in products with:',
    options: [
      'Only CO₂ and H₂O',
      'Leftover O₂ plus dilution N₂',
      'More CO',
      'Higher adiabatic flame temperature',
    ],
    correct_index: 1,
    explanation: 'Extra O₂ and N₂ dilute and cool the flame.',
    difficulty: 'easy',
    topic: 'Combustion',
  },
  {
    id: 'th-ex-28',
    prompt: 'Humidity ratio ω is:',
    options: [
      'P_v/P_g',
      'Mass of vapour per mass of dry air',
      'Dew point temperature',
      'Relative humidity × 100',
    ],
    correct_index: 1,
    explanation: 'Dry-air basis — used in all psychrometric balances.',
    difficulty: 'easy',
    topic: 'Psychrometrics',
  },
  {
    id: 'th-ex-29',
    prompt: 'Cooling moist air below its dew point:',
    options: [
      'Has no effect',
      'Causes condensation (dehumidification)',
      'Increases humidity ratio',
      'Only raises sensible temperature',
    ],
    correct_index: 1,
    explanation: 'Vapor crosses saturation and leaves the air stream.',
    difficulty: 'easy',
    topic: 'Psychrometrics',
  },
  {
    id: 'th-ex-30',
    prompt: 'Relative humidity φ is:',
    options: [
      'ω/ω_max always',
      'P_v / P_g(T) at the current dry-bulb temperature',
      'Dew point / dry bulb',
      'Mass ratio of vapor to total air',
    ],
    correct_index: 1,
    explanation: 'Instantaneous saturation fraction at current T.',
    difficulty: 'easy',
    topic: 'Psychrometrics',
  },
];

export function getThermodynamicsCourse(): Course {
  return {
    id: COURSE_ID,
    slug: 'thermodynamics',
    title: 'Thermodynamics',
    subtitle:
      'Laws, entropy & availability, gas and vapour power cycles, refrigeration, combustion and psychrometrics — ME exam + interview core',
    description: `Thermodynamics is a gatekeeper subject in every mechanical engineering programme and a staple of core placement interviews. This course compresses the full standard syllabus into eight compact lessons: systems, the state postulate and the four laws with Clausius inequality; boundary work and pure-substance property evaluation with steam tables; entropy, isentropic efficiencies and availability (exergy) analysis; Otto, Diesel and Dual air-standard cycles with MEP; the Rankine cycle with reheat and regeneration; vapour-compression refrigeration with COP; combustion equations, excess air and adiabatic flame temperature; and psychrometrics for HVAC.

Every lesson uses the nine-block structure (objectives, hook, concept, worked example, practice, common mistakes, exam angle, graded quiz, summary). A 30-question bank feeds a 15-question timed final. Passing earns a verifiable TieEdu certificate.

**Who this is for:** ME/PI/automotive students in semester 3–5 preparing for university exams, GATE ME fundamentals, and placement interviews that ask thermo questions.

**What you need:** pen and paper, a scientific calculator, and access to steam tables (a compact table is fine).`,
    category: 'Mechanical',
    level: 'intermediate',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    thumbnail_alt: 'Thermodynamics course cover',
    tags: [
      'thermodynamics',
      'rankine',
      'refrigeration',
      'combustion',
      'psychrometrics',
      'mech',
      'free',
      'interview',
    ],
    outcomes: [
      'Classify systems and apply the state postulate and four laws correctly',
      'Compute boundary work for polytropic and other standard processes',
      'Evaluate pure-substance properties with quality and steam-table lookups',
      'Calculate entropy changes, isentropic efficiencies and exergy destruction',
      'Analyze Otto, Diesel and Dual cycles with efficiency and MEP',
      'Solve Rankine-cycle problems including reheat and regeneration effects',
      'Compute COP for refrigeration and heat-pump vapour-compression cycles',
      'Balance combustion equations and use psychrometric properties for HVAC',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-10-14T15:00:00.000Z',
    updated_at: '2026-10-14T15:00:00.000Z',
    instructor_id: null,
    about_course: `University thermodynamics papers reward a disciplined sequence: fix the state, choose the property model (ideal gas vs steam table), pick the correct law or cycle form, balance the energy, then check feasibility with the Second Law. This course trains exactly that sequence across power and refrigeration cycles so answers follow a checkable method rather than formula roulette.

The availability and combustion lessons go beyond plug-and-chug: they teach you to ask "where is the useful work potential destroyed?" and "is this mixture rich or lean?" — the two questions that separate an engineer from a calculator operator in interviews.

The final exam draws from a 30-question bank; the certificate project is a small cycle or HVAC analysis you can show as proof of skill.`,
    prerequisites: [
      'Basic calculus and algebra',
      'Introductory physics (energy, temperature, pressure)',
    ],
    audience: [
      'ME/PI/automotive students facing university thermodynamics exams',
      'GATE ME aspirants building cycle-analysis fundamentals',
      'Placement candidates preparing for core mechanical interview rounds',
      'HVAC and energy-sector beginners who want the math to click',
    ],
    audio_language: 'English',
    caption_language: 'English',
    branch: 'mech',
    branch_label: 'Mechanical / Production / Automotive core',
    bucket: 'B',
    certificate_tier: 'professional',
    estimated_hours: 8,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    exam_prep: {
      target: 'University mid-terms and finals; GATE ME core; placement mechanical rounds',
      units: [
        {
          title: 'Laws, Systems & Properties',
          summary:
            'Open/closed/isolated systems; state postulate (two independent intensive properties). Zeroth defines temperature; First: ΔU = Q − W (closed) or SFEE for control volumes; Second: Clausius ∮δQ/T ≤ 0, Kelvin–Planck, entropy; Third: S = 0 at 0 K. Boundary work: isobaric PΔV, isochoric 0, polytropic (P₂V₂−P₁V₁)/(1−n). Quality x only inside the dome; ideal gas u = u(T).',
          questions: [
            'State the state postulate and the four laws briefly.',
            'Compute polytropic compression work for an ideal gas.',
            'When is quality defined vs undefined?',
            'Show Clausius inequality decides cycle feasibility.',
          ],
          pyqs: [],
        },
        {
          title: 'Entropy, Availability & Gas Cycles',
          summary:
            'ΔS ideal gas = c_p ln(T₂/T₁) − R ln(P₂/P₁); two-phase ΔS via quality. Isentropic efficiency: turbine actual/isen; compressor in isen/actual. Availability Ψ/Helmholtz forms; I = T₀S_gen; η_II = W/W_rev. Otto η = 1 − 1/r^(k−1); Diesel adds cutoff correction; Dual between them; MEP = W_net/displacement. Same r: Otto ≥ Dual ≥ Diesel (air-standard).',
          questions: [
            'Derive Otto efficiency and compare with Diesel at same r.',
            'Define second-law efficiency and irreversibility.',
            'Worked turbine isentropic efficiency problem.',
            'What is MEP and why use it?',
          ],
          pyqs: [],
        },
        {
          title: 'Vapour Power & Refrigeration',
          summary:
            'Rankine: pump (w_p ≈ vΔP), boiler (q_in = h₃−h₂), turbine (w_t = h₃−h₄), condenser (q_out = h₄−h₁); η = w_net/q_in. Reheat raises mean addition T and outlet quality; regeneration preheats feedwater via bleed. Refrigeration: COP_R = q_L/w; COP_HP = COP_R + 1; Carnot COP with Kelvin. Vapour-compression: isen compression, condensation, isenthalpic throttle, evaporation; superheat and subcooling improve COP and protect compressor.',
          questions: [
            'Solve a Rankine cycle with steam-table enthalpies.',
            'Benefits of reheat vs regeneration.',
            'COP_R and COP_HP from given enthalpies.',
            'Why is throttling the main irreversibility in refrigeration?',
          ],
          pyqs: [],
        },
        {
          title: 'Combustion & Psychrometrics',
          summary:
            'Stoichiometric CₓHᵧ + (x+y/4)O₂ → xCO₂ + (y/2)H₂O; carry 3.76 N₂ per O₂ for air. φ = AFR_act/AFR_stoich (>1 rich); % theoretical air; lean → leftover O₂; rich → CO. AFT rises with preheat/fuel value, falls with dilution. Psychrometrics: ω = 0.622 P_v/(P−P_v); φ = P_v/P_g(T); dew point = saturation of current P_v; HVAC processes on the chart; dry-air basis for balances.',
          questions: [
            'Balance methane combustion and find AFR_stoich (mass).',
            'Effect of excess air on flame temperature and products.',
            'Compute ω and dew point from partial pressures.',
            'Sketch sensible heating and dehumidifying cooling on a psych chart.',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Clausius inequality and Kelvin–Planck with equivalence reasoning.',
        'Boundary work formulas for all standard processes.',
        'Isentropic efficiency definitions for turbine vs compressor (ratio flip).',
        'Otto/Diesel efficiency derivations and MEP calculation.',
        'Rankine-cycle enthalpy solve with reheat/regeneration discussion.',
        'COP relationships and Carnot bounds for refrigeration/heat pumps.',
        'Stoichiometric combustion balancing with air dilution N₂.',
        'Humidity ratio, relative humidity and dew point computations.',
      ],
      previous_year_questions: [
        {
          year: '2024',
          question:
            'An ideal Rankine cycle operates between 3 MPa/350°C and 10 kPa. Given h₃ = 3116 kJ/kg, s₃ = 6.745 kJ/kg·K, and at 10 kPa s_f = 0.649, s_g = 8.150, h_f = 192, h_fg = 2392 kJ/kg. Neglecting pump work, determine the thermal efficiency and comment on turbine outlet quality.',
          solution:
            'Isentropic expansion: s₄ = s₃ = 6.745 ⇒ x₄ = (6.745−0.649)/(8.150−0.649) ≈ 0.813. h₄ = 192 + 0.813×2392 ≈ 2137 kJ/kg. w_t = 3116−2137 = 979; q_in ≈ 3116−192 = 2924 (pump neglected). η ≈ 979/2924 ≈ 33.5%. Outlet quality ≈ 0.81 — about 19% moisture; practical designs would add reheat to reduce blade erosion.',
        },
        {
          year: '2023',
          question:
            'A vapour-compression refrigerator has h₁ = 400, h₂ = 430, h₃ = h₄ = 250 kJ/kg. Find COP_R, COP_HP, and discuss the effect of 5 K subcooling.',
          solution:
            'q_L = h₁ − h₄ = 150; w = h₂ − h₁ = 30; q_H = h₂ − h₃ = 180. COP_R = 150/30 = 5; COP_HP = 180/30 = 6 = COP_R + 1. Subcooling lowers h₃ further, increasing q_L per kg (since h₄ = h₃ after the isenthalpic throttle) and raising COP, at the cost of a slightly longer condenser.',
        },
        {
          year: '2025',
          question:
            'Balance the stoichiometric combustion of propane (C₃H₈) in air and compute the mass-based stoichiometric air-fuel ratio. M_air ≈ 29 kg/kmol.',
          solution:
            'C₃H₈ + 5(O₂ + 3.76 N₂) → 3CO₂ + 4H₂O + 18.8 N₂. Moles of air per mole fuel = 5 + 18.8 = 23.8. Mass air = 23.8 × 29 ≈ 690; mass fuel = 3×12 + 8 = 44. AFR_stoich ≈ 690/44 ≈ 15.7 kg air per kg propane.',
        },
      ],
    },
    project: {
      title: 'Cycle or HVAC analysis note',
      brief:
        'Pick one real system (a small Rankine or vapour-compression design, an IC-engine cycle study, or an HVAC coil/room calculation) and analyze it in a markdown/PDF notebook: (1) define the cycle or process and list assumptions; (2) fix each state point using tables or ideal-gas relations (show the property model chosen and why); (3) compute work, heat and efficiency/COP for each component and the overall cycle; (4) perform one Second-Law check (isentropic efficiency, irreversibility, or Carnot bound comparison); (5) suggest one practical improvement (reheat, regeneration, subcooling, excess-air tuning, etc.) and quantify its benefit if possible. Include any software output or hand calculations as an appendix.',
      submission_hint:
        'PDF, public markdown, or a GitHub link — state tables or EES/MATLAB snippets are welcome; the reasoning and state-by-state bookkeeping matter more than polish.',
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
