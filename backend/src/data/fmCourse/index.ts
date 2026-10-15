// Fluid Mechanics — course assembly.
// Phase 4 Bucket B branch core (ME interview + university exam).
import type { Course, ExamQuestion } from '../db';
import { module1 } from './module1';
import { module2 } from './module2';
import { module3 } from './module3';
import { module4 } from './module4';
import { COURSE_ID } from './helpers';

const examBank: ExamQuestion[] = [
  {
    id: 'fm-ex-1',
    prompt: 'In a static fluid of constant density, pressure with depth below the free surface varies:',
    options: ['Linearly', 'Exponentially', 'Parabolically', 'Constant'],
    correct_index: 0,
    explanation: 'p = p₀ + ρgh — linear in depth for constant ρ.',
    difficulty: 'easy',
    topic: 'Fluid statics',
  },
  {
    id: 'fm-ex-2',
    prompt: 'The resultant hydrostatic force on a plane submerged surface (constant ρ) equals:',
    options: [
      'Pressure at the top edge × Area',
      'Pressure at the centroid × Area',
      'Pressure at the bottom edge × Area',
      'Weight of the fluid column above',
    ],
    correct_index: 1,
    explanation: 'F = p_c × A is exact for planar surfaces in uniform density.',
    difficulty: 'easy',
    topic: 'Fluid statics',
  },
  {
    id: 'fm-ex-3',
    prompt: 'For a vertical rectangular gate with its top edge at the free surface, the centre of pressure is at:',
    options: ['h/2', '2h/3', '3h/4', 'h'],
    correct_index: 1,
    explanation: 'Classic 2/3 result — below the centroid.',
    difficulty: 'easy',
    topic: 'Fluid statics',
  },
  {
    id: 'fm-ex-4',
    prompt: 'Buoyant force on a submerged body equals:',
    options: [
      'Weight of the body',
      'Weight of the fluid displaced',
      'ρ_body g V',
      'Zero if fully submerged',
    ],
    correct_index: 1,
    explanation: "Archimedes' principle.",
    difficulty: 'easy',
    topic: 'Buoyancy',
  },
  {
    id: 'fm-ex-5',
    prompt: 'A floating body is initially stable when:',
    options: ['GM < 0', 'GM = 0 only', 'GM > 0 (M above G)', 'G is above the waterline always'],
    correct_index: 2,
    explanation: 'Small-angle stability criterion.',
    difficulty: 'easy',
    topic: 'Buoyancy',
  },
  {
    id: 'fm-ex-6',
    prompt: 'BM (metacentric radius) is given by:',
    options: ['I/V_disp', 'V/I', 'GM × I', 'BG only'],
    correct_index: 0,
    explanation: 'BM = second moment of waterplane / displaced volume.',
    difficulty: 'medium',
    topic: 'Buoyancy',
  },
  {
    id: 'fm-ex-7',
    prompt: 'In a fluid accelerating horizontally with a_x, the free surface slope satisfies:',
    options: ['tan α = g/a_x', 'tan α = a_x/g', 'tan α = 0', 'tan α = a_x·g'],
    correct_index: 1,
    explanation: 'Surface normal leans opposite the acceleration vector.',
    difficulty: 'medium',
    topic: 'Fluid statics',
  },
  {
    id: 'fm-ex-8',
    prompt: 'The material acceleration of a fluid particle is:',
    options: [
      '∂V/∂t only',
      '∂V/∂t + (V·∇)V',
      '(V·∇)V only',
      'g only',
    ],
    correct_index: 1,
    explanation: 'Local + convective terms.',
    difficulty: 'easy',
    topic: 'Kinematics',
  },
  {
    id: 'fm-ex-9',
    prompt: 'In steady flow, streamlines, pathlines and streaklines:',
    options: ['All differ', 'All coincide', 'Only two coincide', 'Are undefined'],
    correct_index: 1,
    explanation: 'Time-independence collapses all three.',
    difficulty: 'easy',
    topic: 'Kinematics',
  },
  {
    id: 'fm-ex-10',
    prompt: "Bernoulli's equation p/ρg + V²/2g + z = const holds:",
    options: [
      'Everywhere in any flow',
      'Along a streamline in steady inviscid incompressible flow',
      'Only in viscous layers',
      'Across hydraulic jumps',
    ],
    correct_index: 1,
    explanation: 'Plus irrotational for a domain-wide constant.',
    difficulty: 'easy',
    topic: 'Bernoulli',
  },
  {
    id: 'fm-ex-11',
    prompt: 'A Pitot-static tube measures velocity via:',
    options: [
      'Mass flow only',
      'Stagnation pressure minus static pressure: V = √(2Δp/ρ)',
      'Temperature rise',
      'Colour injection',
    ],
    correct_index: 1,
    explanation: 'Stagnation point V = 0 in Bernoulli.',
    difficulty: 'easy',
    topic: 'Measurement',
  },
  {
    id: 'fm-ex-12',
    prompt: 'Discharge through a differential pressure meter is proportional to:',
    options: ['Δp', '√Δp', '1/√Δp', 'Δp²'],
    correct_index: 1,
    explanation: 'Square-root relationship from Bernoulli.',
    difficulty: 'easy',
    topic: 'Measurement',
  },
  {
    id: 'fm-ex-13',
    prompt: 'A typical discharge coefficient for a well-designed venturi meter is:',
    options: ['0.6', '0.75', '0.95–0.98', '1.2'],
    correct_index: 2,
    explanation: 'Efficient diffuser recovers most pressure.',
    difficulty: 'easy',
    topic: 'Measurement',
  },
  {
    id: 'fm-ex-14',
    prompt: 'Compared to a venturi, a sharp-edged orifice meter has:',
    options: [
      'Higher C_d and lower permanent loss',
      'Lower C_d and higher permanent loss',
      'Identical C_d',
      'No permanent loss',
    ],
    correct_index: 1,
    explanation: 'Vena contracta + no diffuser recovery.',
    difficulty: 'medium',
    topic: 'Measurement',
  },
  {
    id: 'fm-ex-15',
    prompt: 'Force of a jet (area A, velocity V) on a stationary flat plate normal to the flow is:',
    options: ['ρAV', 'ρAV²', '½ρAV²', '2ρAV²'],
    correct_index: 1,
    explanation: 'Normal momentum flux fully destroyed.',
    difficulty: 'easy',
    topic: 'Momentum',
  },
  {
    id: 'fm-ex-16',
    prompt: 'For a Pelton bucket, maximum power occurs when bucket speed u equals:',
    options: ['V', 'V/2', 'V/4', '0'],
    correct_index: 1,
    explanation: 'Classic impulse-turbine optimum.',
    difficulty: 'medium',
    topic: 'Momentum',
  },
  {
    id: 'fm-ex-17',
    prompt: 'The linear momentum equation for a steady control volume is:',
    options: [
      'ΣF = ṁ(V_in − V_out)',
      'ΣF = ṁ(V_out − V_in)',
      'ΣF = ṁ(V_in + V_out)',
      'ΣF = 0 always',
    ],
    correct_index: 1,
    explanation: 'Includes pressure, gravity and reaction forces in ΣF.',
    difficulty: 'easy',
    topic: 'Momentum',
  },
  {
    id: 'fm-ex-18',
    prompt: 'Reynolds number represents the ratio of:',
    options: [
      'Gravity to viscous forces',
      'Inertia to viscous forces',
      'Inertia to gravity forces',
      'Surface tension to inertia',
    ],
    correct_index: 1,
    explanation: 'Re = ρVL/μ.',
    difficulty: 'easy',
    topic: 'Pipe flow',
  },
  {
    id: 'fm-ex-19',
    prompt: 'For laminar pipe flow, the Darcy friction factor is:',
    options: ['64/Re', '0.079/Re^0.25', 'Constant 0.02', 'ε/D only'],
    correct_index: 0,
    explanation: 'Exact Hagen–Poiseuille result.',
    difficulty: 'easy',
    topic: 'Pipe flow',
  },
  {
    id: 'fm-ex-20',
    prompt: 'Darcy–Weisbach major head loss is:',
    options: ['f(L/D)(V²/2g)', 'fD(L/V²/2g)', 'K V²/2g', '64VL/(gD)'],
    correct_index: 0,
    explanation: 'h_f = f L/D V²/2g.',
    difficulty: 'easy',
    topic: 'Pipe flow',
  },
  {
    id: 'fm-ex-21',
    prompt: 'A minor loss coefficient K for a valve multiplies:',
    options: ['The volume flow rate', 'The local velocity head V²/2g', 'The pipe length', 'The Reynolds number'],
    correct_index: 1,
    explanation: 'h_m = K V²/2g.',
    difficulty: 'easy',
    topic: 'Pipe flow',
  },
  {
    id: 'fm-ex-22',
    prompt: 'Commercial steel pipe roughness ε is typically of order:',
    options: ['0.045 mm', '0.45 mm', '4.5 mm', '0.00045 mm'],
    correct_index: 0,
    explanation: 'Order-of-magnitude memorisation value for Moody problems.',
    difficulty: 'medium',
    topic: 'Pipe flow',
  },
  {
    id: 'fm-ex-23',
    prompt: 'The Buckingham Pi theorem states that n variables with k independent dimensions yield:',
    options: ['n + k Pi groups', '(n − k) Pi groups', 'n × k groups', 'k − n groups'],
    correct_index: 1,
    explanation: 'Dimensionless-group count.',
    difficulty: 'easy',
    topic: 'Dimensional analysis',
  },
  {
    id: 'fm-ex-24',
    prompt: 'Free-surface open-channel model tests primarily match:',
    options: ['Reynolds number', 'Froude number', 'Mach number', 'Weber number'],
    correct_index: 1,
    explanation: 'Gravity dominates wave patterns.',
    difficulty: 'easy',
    topic: 'Similitude',
  },
  {
    id: 'fm-ex-25',
    prompt: 'Drag on a fully submerged incompressible body is best correlated as:',
    options: ['C_D = f(Re)', 'C_D = f(Fr)', 'C_D = f(Ma)', 'C_D constant always'],
    correct_index: 0,
    explanation: 'Dimensional-analysis result for submerged flow.',
    difficulty: 'easy',
    topic: 'Dimensional analysis',
  },
  {
    id: 'fm-ex-26',
    prompt: 'Froude number in a wide rectangular open channel is:',
    options: ['V/√(gy)', 'V/√(gD) with D = A/T', 'VD/ν', 'Both A and B (D ≈ y for wide channels)'],
    correct_index: 3,
    explanation: 'Hydraulic-depth form reduces to √(gy) for wide rectangles.',
    difficulty: 'medium',
    topic: 'Open channel',
  },
  {
    id: 'fm-ex-27',
    prompt: 'Specific energy in an open channel (measured above the bottom) is:',
    options: ['Total head above datum', 'y + V²/(2g)', 'p/ρg only', 'V²/(2g) only'],
    correct_index: 1,
    explanation: 'E = y + V²/(2g).',
    difficulty: 'easy',
    topic: 'Open channel',
  },
  {
    id: 'fm-ex-28',
    prompt: 'Critical depth in a wide rectangular channel (discharge per unit width q) is:',
    options: ['(q²/g)^{1/3}', 'q/g', '(g/q²)^{1/3}', '2q/g'],
    correct_index: 0,
    explanation: 'Minimum-E specific depth.',
    difficulty: 'medium',
    topic: 'Open channel',
  },
  {
    id: 'fm-ex-29',
    prompt: 'A hydraulic jump in a rectangular channel transforms:',
    options: [
      'Subcritical to supercritical',
      'Supercritical to subcritical',
      'Laminar to turbulent only',
      'Critical to stagnant',
    ],
    correct_index: 1,
    explanation: 'Abrupt deceleration with energy loss.',
    difficulty: 'easy',
    topic: 'Open channel',
  },
  {
    id: 'fm-ex-30',
    prompt: 'Energy loss across a hydraulic jump in a rectangular channel is:',
    options: [
      'Zero',
      '(y₂ − y₁)³ / (4 y₁ y₂)',
      'f L V²/(2gD)',
      '½(y₂² − y₁²)',
    ],
    correct_index: 1,
    explanation: 'Classic specific-energy drop formula for the jump.',
    difficulty: 'medium',
    topic: 'Open channel',
  },
];

export function getFluidMechanicsCourse(): Course {
  return {
    id: COURSE_ID,
    slug: 'fluid-mechanics',
    title: 'Fluid Mechanics',
    subtitle:
      'Fluid statics, Bernoulli, flow measurement, momentum forces, pipe losses, dimensional analysis and open-channel flow — ME exam + interview core',
    description: `Fluid Mechanics underpins civil, mechanical and ocean engineering, and it is a favourite of core placement interviews. This course compresses the standard syllabus into eight compact lessons: the hydrostatic law with manometers, hydrostatic force and centre of pressure, buoyancy with metacentre stability, flow kinematics and the Bernoulli equation, venturi/orifice flow measurement, the momentum equation with jet and pipe-bend forces, Darcy–Weisbach pipe losses with the Moody diagram, and dimensional analysis plus open-channel flow with hydraulic jumps.

Every lesson uses the nine-block structure (objectives, hook, concept, worked example, practice, common mistakes, exam angle, graded quiz, summary). A 30-question bank feeds a 15-question timed final. Passing earns a verifiable TieEdu certificate.

**Who this is for:** ME/CE students in semester 3–5 preparing for university exams, GATE ME/CE fundamentals, and placement interviews that ask fluid-mechanics questions.

**What you need:** pen and paper, a scientific calculator, and the ability to sketch control volumes and free-body diagrams.`,
    category: 'Mechanical',
    level: 'intermediate',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    thumbnail_alt: 'Fluid Mechanics course cover',
    tags: [
      'fluid-mechanics',
      'bernoulli',
      'pipe-flow',
      'open-channel',
      'momentum',
      'mech',
      'free',
      'interview',
    ],
    outcomes: [
      'Apply the hydrostatic law and compute forces/centres of pressure on submerged surfaces',
      'Analyze floating-body stability with metacentre height and rigid-body acceleration',
      'Use Bernoulli and continuity for Pitot, venturi and orifice problems',
      'Apply the momentum equation to jets, vanes and pipe-bend reaction forces',
      'Compute Darcy–Weisbach major and minor losses and read the Moody diagram',
      'Derive Pi groups with the Buckingham theorem and state similitude rules',
      'Classify open-channel flow and size hydraulic jumps with conjugate depths',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-10-14T16:00:00.000Z',
    updated_at: '2026-10-14T16:00:00.000Z',
    instructor_id: null,
    about_course: `University fluid-mechanics papers reward a disciplined method: fix the control volume or fluid column, choose the governing equation (hydrostatics, Bernoulli, momentum, or Darcy), apply continuity where velocities couple, and check the dimensionless regime (Re, Fr) before trusting an idealized formula. This course drills that method across statics, measurement, forces, pipe flow and open channels.

The momentum and open-channel lessons are written for people who will design real systems: jet forces size Pelton buckets, Darcy losses size pumps, and hydraulic jumps size stilling basins at the foot of every spillway. The dimensional-analysis lesson closes with the model-testing logic interviewers expect when they ask "how would you test this at 1:50 scale?".

The final exam draws from a 30-question bank; the certificate project is a small flow-system analysis you can show as proof of skill.`,
    prerequisites: [
      'Basic calculus and algebra',
      'Introductory physics (forces, pressure, energy)',
    ],
    audience: [
      'ME/CE students facing university fluid-mechanics exams',
      'GATE ME/CE aspirants building flow-analysis fundamentals',
      'Placement candidates preparing for core mechanical/civil interview rounds',
      'Hydraulics and piping beginners who want the method to click',
    ],
    audio_language: 'English',
    caption_language: 'English',
    branch: 'mech',
    branch_label: 'Mechanical / Civil / Ocean core (also useful for Production)',
    bucket: 'B',
    certificate_tier: 'professional',
    estimated_hours: 8,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    exam_prep: {
      target: 'University mid-terms and finals; GATE ME/CE core; placement fluid-mechanics rounds',
      units: [
        {
          title: 'Fluid Statics & Buoyancy',
          summary:
            'Hydrostatic law dp/dz = −ρg; p = p₀ + ρgh; absolute/gauge/vacuum; manometer column walking. Plane-surface force F = p_c A; centre of pressure y_cp = y_c + I/(y_c A); vertical rectangle 2h/3. Archimedes F_B = ρ_f g V_disp; floating equilibrium; metacentre M, BM = I/V, GM > 0 stability. Rigid-body acceleration: surface slope a_x/g, g_eff = g ± a_z.',
          questions: [
            'Force + centre of pressure on a submerged rectangular gate.',
            'Stability check with GM for a floating box.',
            'Manometer pressure balance.',
            'Effect of vertical acceleration on fluid pressure.',
          ],
          pyqs: [],
        },
        {
          title: 'Kinematics, Bernoulli & Measurement',
          summary:
            'Material derivative a = ∂V/∂t + (V·∇)V; streamlines/pathlines/streaklines coincide only in steady flow. Bernoulli p/ρg + V²/2g + z along a streamline (steady, inviscid, incompressible); add H_p, H_t, h_L. Pitot: V = √(2Δp/ρ). Venturi/orifice/nozzle: Q = C_d A₂ V₂,th with V₂ from Bernoulli + continuity; manometer Δp/ρg = h(SG − 1).',
          questions: [
            'Pitot airspeed from stagnation pressure.',
            'Venturi discharge with mercury manometer reading.',
            'When Bernoulli fails (jumps, machines, rotational flow).',
            'Convective acceleration in a nozzle.',
          ],
          pyqs: [],
        },
          {
          title: 'Momentum & Pipe Flow',
          summary:
            'ΣF = ṁ(V_out − V_in); jet on flat plate F = ρAV²; moving vane uses V − u; Pelton max power at u = V/2. Pipe bend anchoring forces via CV + gauge pressure. Re = VD/ν; laminar f = 64/Re; Darcy–Weisbach h_f = f(L/D)V²/2g; Colebrook/Moody for turbulent; minor h_m = K V²/2g; hydraulic diameter 4A/P.',
          questions: [
            'Jet force on plate / moving bucket.',
            'Pipe bend reaction force.',
            'Moody-based head loss for a steel line.',
            'Series vs parallel pipe reasoning.',
          ],
          pyqs: [],
        },
        {
          title: 'Dimensional Analysis & Open Channel',
          summary:
            'Buckingham Pi: (n − k) groups; Re, Fr, We, Ma, Eu. Similitude: geometric, kinematic, dynamic; ships match Fr, correct Re. Open channel: Fr = V/√(gD) with D = A/T; specific energy E = y + V²/(2g); critical depth y_c = (q²/g)^{1/3}; hydraulic jump conjugate depths y₂/y₁ = ½(√(1 + 8Fr₁²) − 1); ΔE = (y₂−y₁)³/(4y₁y₂).',
          questions: [
            'Derive C_D = f(Re) via Buckingham Pi.',
            'Jump sizing: y₂, energy loss from given y₁, V₁.',
            'Critical depth and regime classification.',
            'Model-law choice (Re vs Fr) for a spillway vs a ship.',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Hydrostatic force and centre-of-pressure derivation for a plane surface.',
        'Metacentre and GM stability criterion with a numerical floating-body example.',
        'Bernoulli assumptions and a complete venturi/orifice discharge derivation.',
        'Momentum-equation jet-force derivation and Pelton moving-vane extension.',
        'Darcy–Weisbach + Colebrook/Moody for turbulent pipe friction.',
        'Buckingham Pi worked example (drag or open-channel wave speed).',
        'Hydraulic-jump conjugate-depth derivation and energy-loss formula.',
        'Re vs Fr model-law selection for different hydraulic structures.',
      ],
      previous_year_questions: [
        {
          year: '2024',
          question:
            'A vertical rectangular gate 2 m wide and 3 m high has its top edge 1 m below the free surface of water. Determine the hydrostatic force on the gate and the position of the centre of pressure from the free surface.',
          solution:
            'Centroid at y_c = 1 + 1.5 = 2.5 m; A = 6 m²; F = ρg y_c A = 1000×9.81×2.5×6 ≈ 147.2 kN. I_xx,c = bh³/12 = 2×27/12 = 4.5 m⁴; y_cp = y_c + I/(y_c A) = 2.5 + 4.5/(2.5×6) = 2.8 m below the free surface (0.3 m below the centroid).',
        },
        {
          year: '2023',
          question:
            'Water flows in a 100 mm commercial-steel pipe (ε = 0.045 mm) at 2 m/s for 50 m. ν = 1×10⁻⁶ m²/s. Find the Darcy friction factor and major head loss.',
          solution:
            'Re = VD/ν = 2×0.1/1e-6 = 2×10⁵ (turbulent); ε/D = 0.00045. From Colebrook/Moody, f ≈ 0.0165. h_f = f(L/D)(V²/2g) = 0.0165×(50/0.1)×(4/19.62) ≈ 1.68 m of water.',
        },
        {
          year: '2025',
          question:
            'A rectangular channel carries water with y₁ = 0.3 m and V₁ = 6 m/s. If a hydraulic jump forms, find the downstream depth y₂ and the energy lost across the jump. g = 9.81 m/s².',
          solution:
            'Fr₁ = V₁/√(gy₁) = 6/√(9.81×0.3) ≈ 3.50. Conjugate depth: y₂/y₁ = ½(√(1+8Fr₁²) − 1) = ½(√99 − 1) = 4.5 ⇒ y₂ ≈ 1.35 m. Energy loss ΔE = (y₂−y₁)³/(4y₁y₂) = (1.05)³/(4×0.3×1.35) ≈ 0.715 m.',
        },
      ],
    },
    project: {
      title: 'Flow-system analysis note',
      brief:
        'Pick one real or well-specified flow system (a pump-fed pipe line, a tank-orifice or venturi measurement, a jet-driven impulse turbine stage, or an open-channel section with a jump) and analyze it in a markdown/PDF notebook: (1) define the system, draw/list the control volume or fluid column and list assumptions; (2) identify the dominant dimensionless regime (Re, Fr) and justify the equations you choose (hydrostatics, Bernoulli, momentum, Darcy–Weisbach); (3) compute pressures, velocities, forces, head losses or conjugate depths step-by-step with units; (4) perform one sanity check (e.g. energy grade line trend, GM stability, or Fr classification before/after a jump); (5) suggest one design improvement (diameter change, meter choice, roughness reduction, jump dissipator sizing) and quantify its effect if possible. Include diagrams or calculator output as an appendix.',
      submission_hint:
        'PDF, public markdown, or a GitHub link — hand sketches photographed are fine; the control-volume choice and unit discipline matter more than production polish.',
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
